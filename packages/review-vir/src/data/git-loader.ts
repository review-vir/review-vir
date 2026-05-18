import {
    extractErrorMessage,
    log,
    mapObjectValues,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type GitUpdatesStoppedReason} from '@review-vir/adapter-core';
import type {AtLeastOneDuration, FullDate} from 'date-vir';
import {defineTypedCustomEvent, defineTypedEvent, ListenTarget} from 'typed-event-target';
import {type WorkerMessage, WorkerMessageType} from '../worker/worker-messages.js';
import {
    type AllServiceGitData,
    gitAdaptersByServiceName,
    type GitServiceName,
} from './all-adapters.js';
import {getAllPullRequestDataCache, getPullRequestDataCache} from './cache-store.js';

export class GitErrorEvent extends defineTypedCustomEvent<{message: string}>()('git-error') {}
export class GitUpdateStartEvent extends defineTypedEvent('git-update-start') {}
export class GitUpdatesPausedEvent extends defineTypedCustomEvent<
    {
        serviceName: GitServiceName;
        message: string;
        reason: GitUpdatesStoppedReason;
    } & PartialWithUndefined<{
        resetAt: FullDate;
    }>
>()('git-updates-paused') {}
export class GitDataUpdated extends defineTypedCustomEvent<{
    data: AllServiceGitData;
}>()('git-data-updated') {}

export class GitDataLoader extends ListenTarget<
    GitErrorEvent | GitUpdatesPausedEvent | GitDataUpdated | GitUpdateStartEvent
> {
    public data: AllServiceGitData | undefined;
    protected adapterWorkers: Record<GitServiceName, Worker>;
    public updatesInProgress: Partial<Record<GitServiceName, boolean>> = {};

    constructor(
        secretEncryptionKey: string,
        protected readonly updateInterval: Readonly<AtLeastOneDuration>,
    ) {
        super();

        // eslint-disable-next-line sonarjs/no-async-constructor
        getAllPullRequestDataCache()
            .then((cacheResult) => {
                if (!this.data) {
                    this.data = cacheResult;
                    this.dispatch(
                        new GitDataUpdated({
                            detail: {
                                data: this.data,
                            },
                        }),
                    );
                }
            })
            .catch((error: unknown) => {
                log.error(`Failed to load cached data: ${extractErrorMessage(error)}`);
            });

        this.adapterWorkers = mapObjectValues(gitAdaptersByServiceName, (serviceName) => {
            const worker = new Worker(new URL('../worker/git-adapter-worker.ts', import.meta.url), {
                type: 'module',
            });

            worker.postMessage(
                JSON.stringify({
                    type: WorkerMessageType.SetupWorker,
                    serviceName,
                    secretEncryptionKey,
                } satisfies WorkerMessage),
            );

            worker.addEventListener('message', async (messageEvent) => {
                const message: WorkerMessage = JSON.parse(messageEvent.data);

                if (message.type === WorkerMessageType.UpdatesStopped) {
                    this.dispatch(
                        new GitUpdatesPausedEvent({
                            detail: {
                                reason: message.reason,
                                message: message.message,
                                serviceName,
                                resetAt: message.resetAt,
                            },
                        }),
                    );
                } else if (message.type === WorkerMessageType.DataUpdated) {
                    this.updatesInProgress[serviceName] = false;
                    if (message.error) {
                        this.dispatch(
                            new GitErrorEvent({
                                detail: {
                                    message: message.error,
                                },
                            }),
                        );
                    } else {
                        const newData = await getPullRequestDataCache(serviceName);

                        if (!this.data) {
                            this.data = mapObjectValues(gitAdaptersByServiceName, () => []);
                        }
                        this.data[serviceName] = newData;

                        this.dispatch(
                            new GitDataUpdated({
                                detail: {
                                    data: this.data,
                                },
                            }),
                        );
                    }
                } else if (message.type === WorkerMessageType.UpdateStarted) {
                    this.updatesInProgress[serviceName] = true;
                    this.dispatch(new GitUpdateStartEvent());
                }
            });

            return worker;
        });
    }

    public startAutoUpdates() {
        Object.values(this.adapterWorkers).forEach((worker) => {
            worker.postMessage(
                JSON.stringify({
                    type: WorkerMessageType.StartAutoUpdates,
                    updateInterval: this.updateInterval,
                } satisfies WorkerMessage),
            );
        });
    }

    public restartService(serviceName: GitServiceName) {
        this.adapterWorkers[serviceName].postMessage(
            JSON.stringify({
                type: WorkerMessageType.StartAutoUpdates,
                updateInterval: this.updateInterval,
            } satisfies WorkerMessage),
        );
    }
}
