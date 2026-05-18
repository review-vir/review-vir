import {assertWrap, check} from '@augment-vir/assert';
import {pickObjectKeys} from '@augment-vir/common';
import {LocalDbClient} from 'local-db-client';
import {checkValidShape, classShape, defineShape, recordShape} from 'object-shape-tester';
import {
    assertValidAuthToken,
    authTokenShape,
    type AuthToken,
    type EncryptedAuthToken,
} from './auth-tokens.js';
import {decrypt, encrypt} from './encryption.js';
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
