import localForageRaw from 'localforage-esm';
import {type EncryptedAuthToken} from './auth-tokens.js';

/**
 * `localforage-esm` re-exports the underlying `localforage` runtime value but its typing collapses
 * the `export =` namespace, hiding `createInstance` from the static type. Cast through the
 * `LocalForage` interface (declared globally by `localforage`) to recover the real methods.
 */
const localForage = localForageRaw as unknown as LocalForage;

const legacyDatabaseName = 'review-vir-auth-tokens';

/** The pre-3.x auth-tokens object store — one entry per service name, no encryption wrapper. */
const legacyAuthTokensStore = localForage.createInstance({
    description: 'Legacy review-vir auth tokens store (pre-3.x layout).',
    name: legacyDatabaseName,
    storeName: legacyDatabaseName,
});

/**
 * Peek at the IndexedDB database with the raw API to see whether the legacy object store exists,
 * without triggering a `versionchange` upgrade. If we let `localforage.keys()` make this check, it
 * would auto-create the store on a fresh install and that upgrade would be blocked by
 * `LocalDbClient`'s still-open connection — hanging the whole load.
 */
async function legacyAuthTokensStoreExists(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const openRequest = globalThis.indexedDB.open(legacyDatabaseName);
        openRequest.onerror = () => resolve(false);
        openRequest.onsuccess = () => {
            const db = openRequest.result;
            const exists = db.objectStoreNames.contains(legacyDatabaseName);
            db.close();
            resolve(exists);
        };
    });
}

/** Returns every legacy entry keyed by service name; empty object when nothing is stored. */
export async function readLegacyAuthTokens(): Promise<
    Readonly<Record<string, ReadonlyArray<Readonly<EncryptedAuthToken>>>>
> {
    if (!(await legacyAuthTokensStoreExists())) {
        return {};
    }

    const keys = await legacyAuthTokensStore.keys();
    const result: Record<string, ReadonlyArray<Readonly<EncryptedAuthToken>>> = {};
    for (const key of keys) {
        const value = await legacyAuthTokensStore.getItem<EncryptedAuthToken[]>(key);
        if (value?.length) {
            result[key] = value;
        }
    }
    return result;
}

/** Deletes the legacy entry for a single service once it has been fully migrated. */
export async function deleteLegacyAuthTokens(serviceName: string): Promise<void> {
    if (!(await legacyAuthTokensStoreExists())) {
        return;
    }
    await legacyAuthTokensStore.removeItem(serviceName);
}

/**
 * Test-only helper: seeds a legacy entry directly into the old store so migration paths can be
 * exercised without rebuilding the previous binary. Do not call from production code.
 *
 * @deprecated Only used for tests
 */
export async function writeLegacyAuthTokens(
    serviceName: string,
    encryptedTokens: ReadonlyArray<Readonly<EncryptedAuthToken>>,
): Promise<void> {
    await legacyAuthTokensStore.setItem(serviceName, [...encryptedTokens]);
}

/**
 * Test-only helper: removes every legacy entry. Do not call from production code.
 *
 * @deprecated Only used for tests
 */
export async function clearLegacyAuthTokens(): Promise<void> {
    if (!(await legacyAuthTokensStoreExists())) {
        return;
    }
    await legacyAuthTokensStore.clear();
}
