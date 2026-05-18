import {extractErrorMessage, log} from '@augment-vir/common';
import {
    GitUpdateDoneEvent,
    GitUpdatesStoppedEvent,
    GitUpdateStartEvent,
    type GitAdapter,
} from '@review-vir/adapter-core';
import {gitAdaptersByServiceName, GitServiceName} from '../data/all-adapters.js';
import {savePullRequestDataCache} from '../data/cache-store.js';
import {WorkerMessageType, type WorkerMessage} from './worker-messages.js';

const maxQueryCost: Readonly<Record<GitServiceName, number>> = {
    [GitServiceName.GitHub]: 3,
};

let adapter: undefined | GitAdapter;

/** This is a worker, it will already be on the same origin. */
// eslint-disable-next-line sonarjs/post-message
self.addEventListener('message', (event) => {
    const message: WorkerMessage = JSON.parse(event.data);

    if (message.type === WorkerMessageType.SetupWorker) {
        adapter = new gitAdaptersByServiceName[message.serviceName](
            message.secretEncryptionKey,
            maxQueryCost[message.serviceName],
        );

        adapter.listen(GitUpdatesStoppedEvent, (event) => {
            self.postMessage(
                JSON.stringify({
                    type: WorkerMessageType.UpdatesStopped,
                    ...event.detail,
                } satisfies WorkerMessage),
            );
        });

        adapter.listen(GitUpdateDoneEvent, async (event) => {
            if (event.detail.data) {
                await savePullRequestDataCache(message.serviceName, event.detail.data);
            }

            self.postMessage(
                JSON.stringify({
                    type: WorkerMessageType.DataUpdated,
                    error: event.detail.error ? extractErrorMessage(event.detail.error) : undefined,
                } satisfies WorkerMessage),
            );
        });
        adapter.listen(GitUpdateStartEvent, () => {
            self.postMessage(
                JSON.stringify({
                    type: WorkerMessageType.UpdateStarted,
                } satisfies WorkerMessage),
            );
        });

        log.faint(`Setup worker for service '${message.serviceName}'`);
    } else if (message.type === WorkerMessageType.StartAutoUpdates) {
        if (!adapter) {
            throw new Error(
                'Cannot start auto updates without first setting up the worker adapter.',
            );
        }

        log.faint(`Starting updates in worker for service '${adapter.serviceName}'`);
        adapter.startAutoUpdates(message.updateInterval);
    }
});
