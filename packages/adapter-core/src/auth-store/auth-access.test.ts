/* eslint-disable @typescript-eslint/no-deprecated */
import {assert} from '@augment-vir/assert';
import {type AnyObject, randomString} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {
    loadServiceAuthTokens,
    resetLegacyMigrationStateForTests,
    reviewVirAuthTokensClientPromise,
    saveServiceAuthTokens,
} from './auth-access.js';
import {type AuthToken, type EncryptedAuthToken} from './auth-tokens.js';
import {encryptLegacy} from './encryption.js';
import {
    clearLegacyAuthTokens,
    readLegacyAuthTokens,
    writeLegacyAuthTokens,
} from './legacy-auth-store.js';

function runAuthTokenTest(testCallback: () => Promise<void>) {
    return async () => {
        const client = await reviewVirAuthTokensClientPromise;
        await client.clear();
        await testCallback();
        await client.clear();
    };
}

async function getStoredServiceNames(): Promise<string[]> {
    const client = await reviewVirAuthTokensClientPromise;
    return Object.keys(client.value.encryptedTokens || {});
}

const mockEncryptionKey = randomString(32);
const mockServiceName = 'github';

describe(loadServiceAuthTokens.name, () => {
    it(
        'loads nothing if nothing is saved',
        runAuthTokenTest(async () => {
            const tokens = await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.isEmpty(Object.keys(tokens));
        }),
    );
    it('uses dev auth tokens', async () => {
        const secretsFile = {
            authTokens: {
                [mockServiceName]: [
                    {
                        authTokenName: 'mock token name',
                        authTokenSecret: 'mock token secret',
                    } satisfies AuthToken,
                ],
            },
        };

        (globalThis as AnyObject)['VITE_INJECTED_SECRETS_FILE'] = secretsFile;

        const loadedAuthTokens = await loadServiceAuthTokens({
            serviceName: mockServiceName,
            secretEncryptionKey: mockEncryptionKey,
        });

        assert.deepEquals(loadedAuthTokens, secretsFile.authTokens[mockServiceName]);
    });
    it('handles empty token secret', async () => {
        await saveServiceAuthTokens({
            authTokens: [
                {
                    authTokenName: 'invalid secret',
                    authTokenSecret: '',
                },
            ],
            secretEncryptionKey: mockEncryptionKey,
            serviceName: mockServiceName,
        });

        assert.isNotEmpty(await getStoredServiceNames());

        assert.isEmpty(
            await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            }),
        );

        assert.isEmpty(await getStoredServiceNames());
    });
    it('handles invalid saved token', async () => {
        await saveServiceAuthTokens({
            authTokens: [
                {
                    authTokenName: 'invalid secret',
                    authTokenSecret: '',
                    // @ts-expect-error: invalid key
                    invalidKey: 4,
                },
            ],
            secretEncryptionKey: mockEncryptionKey,
            serviceName: mockServiceName,
        });

        assert.isNotEmpty(await getStoredServiceNames());

        assert.isEmpty(
            await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            }),
        );

        assert.isEmpty(await getStoredServiceNames());
    });
    it(
        'loads saved tokens',
        runAuthTokenTest(async () => {
            const mockAuthTokens: AuthToken[] = [
                {
                    authTokenName: randomString(16),
                    authTokenSecret: randomString(128),
                },
            ];

            await saveServiceAuthTokens({
                serviceName: mockServiceName,
                authTokens: mockAuthTokens,
                secretEncryptionKey: mockEncryptionKey,
            });

            const loadedAuthTokens = await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.deepEquals(loadedAuthTokens, mockAuthTokens);
        }),
    );
});

describe('legacy auth token migration', () => {
    async function setUp(): Promise<void> {
        const client = await reviewVirAuthTokensClientPromise;
        /**
         * `LocalDbClient.clear()` only wipes IndexedDB — the in-memory `client.value` cache
         * survives, so migration code that spreads `{...client.value.encryptedTokens}` would carry
         * over data from earlier tests. `delete.encryptedTokens()` clears both.
         */
        await client.delete.encryptedTokens();
        await clearLegacyAuthTokens();
        resetLegacyMigrationStateForTests();
        /**
         * An earlier suite seeds `VITE_INJECTED_SECRETS_FILE` and never resets it; clear it here so
         * the empty-storage fallback in `loadServiceAuthTokens` doesn't return dev tokens.
         */
        delete (globalThis as AnyObject)['VITE_INJECTED_SECRETS_FILE'];
    }

    function runLegacyMigrationTest(testCallback: () => Promise<void>) {
        return async () => {
            await setUp();
            try {
                await testCallback();
            } finally {
                await setUp();
            }
        };
    }

    async function seedLegacyToken(
        serviceName: string,
        authToken: Readonly<AuthToken>,
    ): Promise<EncryptedAuthToken> {
        const {encryptedData, publicInitVector} = await encryptLegacy({
            data: JSON.stringify(authToken),
            secretEncryptionKey: mockEncryptionKey,
        });
        const legacyEntry: EncryptedAuthToken = {
            data: encryptedData,
            publicInitVector,
        };
        const existing = await readLegacyAuthTokens();
        await writeLegacyAuthTokens(serviceName, [
            ...(existing[serviceName] || []),
            legacyEntry,
        ]);
        return legacyEntry;
    }

    it(
        'migrates a legacy entry on first load',
        runLegacyMigrationTest(async () => {
            const originalToken: AuthToken = {
                authTokenName: 'migrated token name',
                authTokenSecret: randomString(64),
            };
            await seedLegacyToken(mockServiceName, originalToken);

            const loadedTokens = await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.deepEquals(loadedTokens, [originalToken]);

            const legacyAfter = await readLegacyAuthTokens();
            assert.isEmpty(Object.keys(legacyAfter));

            const client = await reviewVirAuthTokensClientPromise;
            const newLayoutEntries = client.value.encryptedTokens?.[mockServiceName];
            assert.isLengthExactly(newLayoutEntries || [], 1);
        }),
    );

    it(
        'migrates multiple services in one pass',
        runLegacyMigrationTest(async () => {
            const githubToken: AuthToken = {
                authTokenName: 'gh',
                authTokenSecret: randomString(32),
            };
            const gitlabToken: AuthToken = {
                authTokenName: 'gl',
                authTokenSecret: randomString(32),
            };
            await seedLegacyToken('github', githubToken);
            await seedLegacyToken('gitlab', gitlabToken);

            const githubLoaded = await loadServiceAuthTokens({
                serviceName: 'github',
                secretEncryptionKey: mockEncryptionKey,
            });
            const gitlabLoaded = await loadServiceAuthTokens({
                serviceName: 'gitlab',
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.deepEquals(githubLoaded, [githubToken]);
            assert.deepEquals(gitlabLoaded, [gitlabToken]);

            const legacyAfter = await readLegacyAuthTokens();
            assert.isEmpty(Object.keys(legacyAfter));
        }),
    );

    it(
        'is a no-op when there is no legacy data',
        runLegacyMigrationTest(async () => {
            const loadedTokens = await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            });
            assert.isEmpty(loadedTokens);

            const legacyAfter = await readLegacyAuthTokens();
            assert.isEmpty(Object.keys(legacyAfter));
        }),
    );

    it(
        'preserves existing new-layout tokens during migration',
        runLegacyMigrationTest(async () => {
            const preExistingToken: AuthToken = {
                authTokenName: 'already in new layout',
                authTokenSecret: randomString(32),
            };
            await saveServiceAuthTokens({
                authTokens: [preExistingToken],
                secretEncryptionKey: mockEncryptionKey,
                serviceName: 'github',
            });

            const legacyToken: AuthToken = {
                authTokenName: 'legacy for other service',
                authTokenSecret: randomString(32),
            };
            await seedLegacyToken('gitlab', legacyToken);
            /**
             * `saveServiceAuthTokens` already ran one migration pass; reset so the next load
             * actually re-checks the legacy store.
             */
            resetLegacyMigrationStateForTests();

            const gitlabLoaded = await loadServiceAuthTokens({
                serviceName: 'gitlab',
                secretEncryptionKey: mockEncryptionKey,
            });
            const githubLoaded = await loadServiceAuthTokens({
                serviceName: 'github',
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.deepEquals(gitlabLoaded, [legacyToken]);
            assert.deepEquals(githubLoaded, [preExistingToken]);
        }),
    );

    it(
        'leaves the legacy entry in place when some blobs fail to decrypt',
        runLegacyMigrationTest(async () => {
            const goodToken: AuthToken = {
                authTokenName: 'recoverable',
                authTokenSecret: randomString(32),
            };
            const goodLegacy = await seedLegacyToken(mockServiceName, goodToken);
            /** A blob with the right shape but a corrupted ciphertext won't decrypt. */
            const corruptedLegacy: EncryptedAuthToken = {
                data: new Uint8Array([
                    0,
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                ]),
                publicInitVector: goodLegacy.publicInitVector,
            };
            await writeLegacyAuthTokens(mockServiceName, [
                goodLegacy,
                corruptedLegacy,
            ]);

            const loadedTokens = await loadServiceAuthTokens({
                serviceName: mockServiceName,
                secretEncryptionKey: mockEncryptionKey,
            });

            assert.deepEquals(loadedTokens, [goodToken]);

            const legacyAfter = await readLegacyAuthTokens();
            assert.deepEquals(Object.keys(legacyAfter), [mockServiceName]);
        }),
    );
});

describe(saveServiceAuthTokens.name, () => {
    it('rejects empty encryption key', async () => {
        await assert.throws(
            () =>
                saveServiceAuthTokens({
                    authTokens: [],
                    secretEncryptionKey: '',
                    serviceName: mockServiceName,
                }),
            {
                matchMessage: 'Missing encryption key',
            },
        );
    });
    it('wipes the service if saving an empty array', async () => {
        await saveServiceAuthTokens({
            authTokens: [
                {
                    authTokenName: 'mock name',
                    authTokenSecret: 'mock secret',
                },
            ],
            secretEncryptionKey: mockEncryptionKey,
            serviceName: mockServiceName,
        });

        assert.isLengthExactly(await getStoredServiceNames(), 1);

        await saveServiceAuthTokens({
            authTokens: [],
            secretEncryptionKey: mockEncryptionKey,
            serviceName: mockServiceName,
        });
        assert.isEmpty(await getStoredServiceNames());
    });
});
