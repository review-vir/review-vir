import {mapObjectValues} from '@augment-vir/common';
import {gitDataShape, type GitData} from '@review-vir/adapter-core';
import {LocalDbClient} from 'local-db-client';
import {assertValidShape, defineShape} from 'object-shape-tester';
import {GitServiceName, type AllServiceGitData} from './all-adapters.js';

const cacheClientPromise = LocalDbClient.createClient(
    mapObjectValues(GitServiceName, () => defineShape([gitDataShape])),
    {
        storeName: 'review-vir-data-cache',
    },
);

export async function savePullRequestDataCache(
    serviceName: GitServiceName,
    data: ReadonlyArray<Readonly<GitData>>,
) {
    data.forEach((dataEntry) => {
        assertValidShape(dataEntry, gitDataShape, {
            allowExtraKeys: true,
        });
    });

    const client = await cacheClientPromise;
    await client.set[serviceName]([...data]);
}

export async function getAllPullRequestDataCache(): Promise<AllServiceGitData> {
    const client = await cacheClientPromise;
    return mapObjectValues(GitServiceName, (serviceName) => {
        return [...(client.value[serviceName] || [])];
    });
}

export async function getPullRequestDataCache(serviceName: GitServiceName): Promise<GitData[]> {
    const client = await cacheClientPromise;
    return [...(client.value[serviceName] || [])];
}
