import {arrayToObject, type ArrayElement} from '@augment-vir/common';
import {type GitAdapterDefinition, type GitData} from '@review-vir/adapter-core';
import {GithubAdapter} from '@review-vir/github-adapter';

export const allGitAdapters = [
    GithubAdapter,
] as const satisfies ReadonlyArray<GitAdapterDefinition>;

export const gitAdaptersByServiceName = arrayToObject(allGitAdapters, (gitAdapter) => {
    return {
        key: gitAdapter.serviceName,
        value: gitAdapter,
    };
}) as {
    [ServiceName in GitServiceName]: Extract<
        ArrayElement<typeof allGitAdapters>,
        {serviceName: ServiceName}
    >;
};

export type GitServiceName = ArrayElement<typeof allGitAdapters>['serviceName'];
export const GitServiceName = arrayToObject(allGitAdapters, (adapter) => {
    return {
        key: adapter.serviceName,
        value: adapter.serviceName,
    };
}) as {[ServiceName in GitServiceName]: GitServiceName};

export type AllServiceGitData = Record<GitServiceName, GitData[]>;
