import {arrayToObject, getObjectTypedValues, type Values} from '@augment-vir/common';
import {type AuthToken, loadServiceAuthTokens} from '@review-vir/adapter-core';
import {allGitAdapters, type GitServiceName} from './all-adapters.js';

export type ServiceAuthTokens = Readonly<
    Record<GitServiceName, ReadonlyArray<Readonly<AuthToken>>>
>;

export async function loadAllAdapterAuthTokens(
    secretEncryptionKey: string,
): Promise<ServiceAuthTokens> {
    return (await arrayToObject(allGitAdapters, async (adapter) => {
        const tokens = await loadServiceAuthTokens({
            secretEncryptionKey,
            serviceName: adapter.serviceName,
        });

        return {
            key: adapter.serviceName satisfies keyof ServiceAuthTokens,
            value: tokens satisfies Values<ServiceAuthTokens>,
        };
    })) as ServiceAuthTokens;
}

export function countAuthTokens(serviceAuthTokens: ServiceAuthTokens): number {
    return getObjectTypedValues(serviceAuthTokens).reduce((count, authTokens) => {
        return authTokens.length + count;
    }, 0);
}
