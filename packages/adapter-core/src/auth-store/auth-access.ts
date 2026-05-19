import {assertWrap, check} from '@augment-vir/assert';
import {pickObjectKeys} from '@augment-vir/common';
import {LocalDbClient} from 'local-db-client';
import localForageRaw from 'localforage-esm';
import {checkValidShape, classShape, defineShape, recordShape} from 'object-shape-tester';
import {
    assertValidAuthToken,
    authTokenShape,
    type AuthToken,
    type EncryptedAuthToken,
} from './auth-tokens.js';
import {decrypt, decryptLegacy, encrypt} from './encryption.js';
import {getGitAdapterGlobalVars} from './global-vars.js';

const encryptedAuthTokenShape = defineShape({
    data: classShape(Uint8Array),
    publicInitVector: classShape(Uint8Array),
});

const encryptedAuthTokensByServiceShape = recordShape({
    keys: '',
    values: [encryptedAuthTokenShape],
});

export const reviewVirAuthTokensClientPromise = LocalDbClient.createClient(
    {
        encryptedTokens: encryptedAuthTokensByServiceShape,
    },
    {
        storeName: 'review-vir-auth-tokens',
    },
);

/**
 * `localforage-esm` re-exports the underlying `localforage` runtime value but its typing collapses
 * the `export =` namespace, hiding `createInstance` from the static type. Cast through the
 * `LocalForage` interface (declared globally by `localforage`) to recover the real methods.
 */
const localForage = localForageRaw as unknown as LocalForage;

/**
 * The pre-3.x auth-token store. Same IndexedDB database as `reviewVirAuthTokensClientPromise` but a
 * different object store within that database, with one entry per service name. Read-only here;
 * used only to drive the one-time migration into the new layout below.
 */
const legacyAuthTokensStore = localForage.createInstance({
    description: 'Legacy review-vir auth tokens store (pre-3.x layout).',
    name: 'review-vir-auth-tokens',
    storeName: 'review-vir-auth-tokens',
});

let legacyMigrationPromise: Promise<void> | undefined;

async function migrateLegacyAuthTokens(secretEncryptionKey: string): Promise<void> {
    const legacyKeys = await legacyAuthTokensStore.keys();
    if (!legacyKeys.length) {
        return;
    }

    const client = await reviewVirAuthTokensClientPromise;
    const merged: Record<string, EncryptedAuthToken[]> = {
        ...client.value.encryptedTokens,
    };

    /**
     * Migrate one service at a time so a single bad blob doesn't block the others. We only delete a
     * legacy key once every one of its tokens has been successfully re-encrypted under the new
     * derivation — partial failures leave the legacy data in place for inspection.
     */
    for (const legacyKey of legacyKeys) {
        const legacyEncryptedTokens =
            await legacyAuthTokensStore.getItem<EncryptedAuthToken[]>(legacyKey);
        if (!legacyEncryptedTokens?.length) {
            await legacyAuthTokensStore.removeItem(legacyKey);
            continue;
        }

        const reEncryptedTokens: EncryptedAuthToken[] = [];
        for (const legacyEncryptedToken of legacyEncryptedTokens) {
            try {
                const decryptedJson = await decryptLegacy({
                    secretEncryptionKey,
                    encryptedData: legacyEncryptedToken.data,
                    publicInitVector: legacyEncryptedToken.publicInitVector,
                });
                const authToken: unknown = JSON.parse(decryptedJson);
                if (
                    !checkValidShape(authToken, authTokenShape, {
                        allowExtraKeys: true,
                    })
                ) {
                    continue;
                }
                reEncryptedTokens.push(
                    await encryptAuthToken({
                        secretEncryptionKey,
                        authToken,
                    }),
                );
            } catch {
                /** Skip blobs that don't decrypt — likely a key rotation or corruption. */
            }
        }

        if (reEncryptedTokens.length) {
            merged[legacyKey] = (merged[legacyKey] || []).concat(reEncryptedTokens);
        }
        if (reEncryptedTokens.length === legacyEncryptedTokens.length) {
            await legacyAuthTokensStore.removeItem(legacyKey);
        }
    }

    await client.set.encryptedTokens(merged);
}

async function ensureLegacyMigration(secretEncryptionKey: string): Promise<void> {
    if (!legacyMigrationPromise) {
        legacyMigrationPromise = migrateLegacyAuthTokens(secretEncryptionKey).catch(
            (error: unknown) => {
                console.error('Failed to migrate legacy auth tokens:', error);
                /** Allow a retry on the next load. */
                legacyMigrationPromise = undefined;
            },
        );
    }
    return legacyMigrationPromise;
}

async function decryptToken(
    secretEncryptionKey: string,
    encryptedToken: EncryptedAuthToken,
): Promise<Readonly<AuthToken> | undefined> {
    const decryptedJson = await decrypt({
        secretEncryptionKey,
        encryptedData: encryptedToken.data,
        publicInitVector: encryptedToken.publicInitVector,
    });

    const authToken = JSON.parse(decryptedJson);

    return checkValidShape(authToken, authTokenShape, {
        allowExtraKeys: true,
    })
        ? authToken
        : undefined;
}

export async function loadServiceAuthTokens({
    serviceName,
    secretEncryptionKey,
}: Readonly<{
    serviceName: string;
    secretEncryptionKey: string;
}>): Promise<ReadonlyArray<Readonly<AuthToken>>> {
    try {
        /** Only applicable in dev. Might not exist. */
        const serviceAuthTokensFromDevFile: ReadonlyArray<Readonly<AuthToken>> | undefined =
            getGitAdapterGlobalVars().devAuthTokens?.[serviceName];

        await ensureLegacyMigration(secretEncryptionKey);

        const client = await reviewVirAuthTokensClientPromise;
        const allEncryptedTokens = client.value.encryptedTokens || {};
        const encryptedTokens: ReadonlyArray<Readonly<EncryptedAuthToken>> | undefined =
            allEncryptedTokens[serviceName];

        if (!encryptedTokens?.length) {
            if (serviceAuthTokensFromDevFile?.length) {
                return serviceAuthTokensFromDevFile;
            } else {
                return [];
            }
        }

        const decryptedServiceTokens: ReadonlyArray<Readonly<AuthToken>> = (
            await Promise.all(
                encryptedTokens.map(async (encryptedToken) => {
                    const token = await decryptToken(secretEncryptionKey, encryptedToken);

                    assertValidAuthToken(token, serviceName);
                    return token;
                }),
            )
        ).filter(check.isTruthy);

        return decryptedServiceTokens;
    } catch {
        console.error('Failed to load auth tokens. Wiping store.');
        const client = await reviewVirAuthTokensClientPromise;
        const remaining = {
            ...client.value.encryptedTokens,
        };
        delete remaining[serviceName];
        await client.set.encryptedTokens(remaining);
        return [];
    }
}

async function encryptAuthToken({
    secretEncryptionKey,
    authToken,
}: {
    secretEncryptionKey: string;
    authToken: Readonly<AuthToken>;
}): Promise<EncryptedAuthToken> {
    const {encryptedData, publicInitVector} = await encrypt({
        data: JSON.stringify(authToken),
        secretEncryptionKey,
    });

    return {
        data: encryptedData,
        publicInitVector,
    };
}

export async function saveServiceAuthTokens({
    serviceName,
    secretEncryptionKey,
    authTokens,
}: Readonly<{
    serviceName: string;
    secretEncryptionKey: string | undefined;
    authTokens: ReadonlyArray<Readonly<AuthToken>> | undefined;
}>) {
    if (!secretEncryptionKey) {
        throw new Error('Missing encryption key.');
    }

    await ensureLegacyMigration(secretEncryptionKey);

    const client = await reviewVirAuthTokensClientPromise;
    const allTokens = {
        ...client.value.encryptedTokens,
    };

    if (authTokens?.length) {
        const encryptedAuthTokens = await Promise.all(
            authTokens.map(async (authToken): Promise<Readonly<EncryptedAuthToken>> => {
                return await encryptAuthToken({
                    secretEncryptionKey,
                    authToken,
                });
            }),
        );

        allTokens[serviceName] = encryptedAuthTokens;
    } else {
        delete allTokens[serviceName];
    }

    await client.set.encryptedTokens(allTokens);
}

export async function removeUnusedServiceAuthTokens(supportedServiceNames: ReadonlyArray<string>) {
    const client = await reviewVirAuthTokensClientPromise;
    const allTokens = client.value.encryptedTokens || {};
    const filteredTokens = pickObjectKeys(allTokens, supportedServiceNames);
    await client.set.encryptedTokens(filteredTokens);
}

assertWrap.isString('hi');
