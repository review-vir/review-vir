import {type FetchGitDataFunction, GitAdapter} from './git-adapter.js';

export type GitAdapterDefinition<ServiceName extends string = string> = (new (
    /** Used to load auth tokens. */
    secretEncryptionKey: string,
    /**
     * Max query cost per auto-update interval. When an update costs more than this, the wait before
     * the next auto-update is stretched in proportion (double the cost, double the wait).
     */
    queryCostMax: number,
) => GitAdapter) & {
    readonly serviceName: ServiceName;
};

export function defineGitAdapter<const ServiceName extends string>({
    fetchGitData,
    serviceName,
}: {
    /**
     * The name of the service that this adapter will connect to.
     *
     * @example 'github'
     */
    serviceName: ServiceName;
    /** This is the function that fetches data from the service that this adapter is connecting to. */
    fetchGitData: FetchGitDataFunction;
}): GitAdapterDefinition<ServiceName> {
    return class extends GitAdapter {
        public static readonly serviceName = serviceName;
        constructor(
            ...[
                secretEncryptionKey,
                queryCostMax,
            ]: ConstructorParameters<GitAdapterDefinition<ServiceName>>
        ) {
            super(serviceName, fetchGitData, queryCostMax, secretEncryptionKey);
        }
    };
}
