import {check} from '@augment-vir/assert';
import {ensureError, wrapPromiseInTimeout, type MaybePromise} from '@augment-vir/common';
import {convertDuration, toLocaleString, type AnyDuration} from 'date-vir';
import {TypedListenTarget} from 'typed-event-target';
import {loadServiceAuthTokens} from '../auth-store/auth-access.js';
import type {AuthToken} from '../auth-store/auth-tokens.js';
import type {GitData} from '../git/git-data.js';
import {
    GitUpdateDoneEvent,
    GitUpdateSkippedEvent,
    GitUpdatesStoppedEvent,
    GitUpdatesStoppedReason,
    GitUpdateStartEvent,
    type GitAdapterEvents,
} from './git-adapter.event.js';
import {RateLimitedError} from './rate-limited.error.js';

export type FetchGitDataResult = {
    queryCost: number;
    data: GitData[];
};
export type FetchGitDataFunction = (
    authToken: Readonly<AuthToken>,
) => MaybePromise<FetchGitDataResult>;

/**
 * Extend this class to implement new adapters. Make sure to override and implement the
 * `internalUpdate` method.
 */
export class GitAdapter extends TypedListenTarget<GitAdapterEvents> {
    protected intervalState = {
        /** Set this to `false` if the query cost gets too high or if the query repeatedly fails. */
        highestQueryCost: 0,
        queryFailureCount: 0,
        /** The number of times the query has been executed on an interval. */
        queryCount: 0,
    };
    protected nextIntervalTimeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    protected updateInterval: Readonly<AnyDuration> | undefined;

    public isUpdating = false;

    protected validateInterval(): void {
        if (
            /** If there haven't been any queries yet, there's nothing to check. */
            this.intervalState.queryCount < 1 ||
            !this.updateInterval
        ) {
            return;
        }

        const failureRate = Math.ceil(
            (this.intervalState.queryFailureCount / this.intervalState.queryCount) * 100,
        );
        if (this.intervalState.queryCount > 3 && failureRate > 75) {
            this.updateInterval = undefined;
            this.dispatch(
                new GitUpdatesStoppedEvent({
                    detail: {
                        reason: GitUpdatesStoppedReason.HighFailureRate,
                        message: `Query failure rate too high (${failureRate}%), turning off auto-updates for '${this.serviceName}'.`,
                    },
                }),
            );
        } else if (this.intervalState.highestQueryCost > this.queryCostMax) {
            this.updateInterval = undefined;
            this.dispatch(
                new GitUpdatesStoppedEvent({
                    detail: {
                        reason: GitUpdatesStoppedReason.ExcessiveCost,
                        message: `Query cost too high (${this.intervalState.highestQueryCost}), turning off auto-updates for '${this.serviceName}'.`,
                    },
                }),
            );
        }
    }

    protected setNextUpdate() {
        /** In practice this will never be `false` at this point but we need the type guard anyway. */
        /* node:coverage ignore next 3 */
        if (!this.updateInterval) {
            return;
        }

        const milliseconds = convertDuration(this.updateInterval, {
            milliseconds: true,
        }).milliseconds;

        /** Ignore 0 milliseconds. */
        if (milliseconds) {
            globalThis.clearTimeout(this.nextIntervalTimeout);
            this.nextIntervalTimeout = globalThis.setTimeout(async () => {
                await this.updateOnInterval();
            }, milliseconds);
        }
    }

    protected async updateOnInterval() {
        if (this.isUpdating) {
            this.dispatch(new GitUpdateSkippedEvent());
            this.setNextUpdate();
            return;
        }

        this.validateInterval();

        if (!this.updateInterval) {
            return;
        }

        this.setNextUpdate();

        try {
            await this.updateData();
        } catch {
            /** Already dispatched via GitUpdateDoneEvent; swallow to avoid an unhandled rejection. */
        }
    }

    public startAutoUpdates(interval: Readonly<AnyDuration>) {
        /**
         * Reset interval state on each start so a Resume after a pause (e.g. rate-limited) gets a
         * fresh window — otherwise carried-over failure counts or query-cost peaks would re-trip
         * `validateInterval` immediately.
         */
        this.intervalState = {
            highestQueryCost: 0,
            queryFailureCount: 0,
            queryCount: 0,
        };
        globalThis.clearTimeout(this.nextIntervalTimeout);
        this.updateInterval = interval;
        void this.updateOnInterval();
    }
    public stopAutoUpdates() {
        this.updateInterval = undefined;
    }

    public async updateData(): Promise<GitData[]> {
        this.isUpdating = true;
        this.dispatch(new GitUpdateStartEvent());
        this.intervalState.queryCount++;

        try {
            const authTokens = await loadServiceAuthTokens({
                secretEncryptionKey: this.secretEncryptionKey,
                serviceName: this.serviceName,
            });
            if (!authTokens.length) {
                throw new Error(
                    `No auth tokens were found for '${this.serviceName}'; no data loaded.`,
                );
            }

            const allData = (
                await Promise.all(
                    authTokens.map(async (authToken) => {
                        const result = this.fetchGitData(authToken);

                        const {data, queryCost} = await wrapPromiseInTimeout(
                            {
                                minutes: 2,
                            },
                            check.isPromise(result) ? result : Promise.resolve(result),
                        );
                        if (queryCost > this.intervalState.highestQueryCost) {
                            this.intervalState.highestQueryCost = queryCost;
                        }

                        return data;
                    }),
                )
            ).flat();

            this.dispatch(
                new GitUpdateDoneEvent({
                    detail: {
                        data: allData,
                    },
                }),
            );

            return allData;
        } catch (caught) {
            this.intervalState.queryFailureCount++;
            const error = ensureError(caught);
            if (error instanceof RateLimitedError) {
                this.updateInterval = undefined;
                globalThis.clearTimeout(this.nextIntervalTimeout);
                const resetSuffix = error.resetAt
                    ? ` Resets at ${toLocaleString(error.resetAt, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                      })}.`
                    : '';
                this.dispatch(
                    new GitUpdatesStoppedEvent({
                        detail: {
                            reason: GitUpdatesStoppedReason.RateLimited,
                            message: `Rate limit hit, turning off auto-updates for '${this.serviceName}'.${resetSuffix}`,
                            resetAt: error.resetAt,
                        },
                    }),
                );
            }
            this.dispatch(
                new GitUpdateDoneEvent({
                    detail: {
                        error,
                    },
                }),
            );
            throw error;
            /** Web-test-runner thinks this block is never executed but that is clearly not the case. */
            /* node:coverage ignore next 3
             */
        } finally {
            this.isUpdating = false;
        }
    }

    public override destroy() {
        super.destroy();
        this.updateInterval = undefined;
        globalThis.clearTimeout(this.nextIntervalTimeout);
    }

    constructor(
        public readonly serviceName: string,
        protected readonly fetchGitData: FetchGitDataFunction,
        protected queryCostMax: number,
        protected secretEncryptionKey: string,
    ) {
        super();
    }
}
