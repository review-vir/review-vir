import {assert, waitUntil} from '@augment-vir/assert';
import {extractErrorMessage, randomString, wait} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {getNowInUserTimezone} from 'date-vir';
import {saveServiceAuthTokens} from '../auth-store/auth-access.js';
import {defineGitAdapter, type GitAdapterDefinition} from './define-git-adapter.js';
import {MockGitAdapter} from './define-git-adapter.mock.js';
import {gitAdapterEvents} from './git-adapter.event.js';
import {GitAdapter} from './git-adapter.js';

const mockEncryptionKey = randomString(16);

describe(GitAdapter.name, () => {
    const FailingMockGitAdapter = defineGitAdapter({
        async fetchGitData() {
            await wait({
                milliseconds: 10,
            });
            throw new Error('Intentional failure.');
        },
        serviceName: 'mock git failure',
    });

    async function setupInstance(
        queryCostMax: number = 100,
        constructor: GitAdapterDefinition = MockGitAdapter,
        skipAuthTokens = false,
    ) {
        if (!skipAuthTokens) {
            await saveServiceAuthTokens({
                authTokens: [
                    {
                        authTokenName: 'mock token name',
                        authTokenSecret: 'mock token secret',
                    },
                ],
                serviceName: constructor.serviceName,
                secretEncryptionKey: mockEncryptionKey,
            });
        }

        const instance = new constructor(mockEncryptionKey, queryCostMax);

        const events: {
            message: string | undefined;
            type: string;
        }[] = [];
        Object.values(gitAdapterEvents).forEach((eventConstructor) => {
            instance.listen(eventConstructor, (event) => {
                const message =
                    'detail' in event
                        ? 'error' in event.detail
                            ? extractErrorMessage(event.detail.error)
                            : 'message' in event.detail
                              ? event.detail.message
                              : undefined
                        : undefined;

                events.push({
                    message,
                    type: event.constructor.name,
                });
            });
        });

        return {
            instance,
            events,
        };
    }

    it('does not start updating automatically', async () => {
        const {instance, events} = await setupInstance();
        assert.instanceOf(instance, GitAdapter);
        assert.isFalse(instance.isUpdating);

        await wait({
            seconds: 1,
        });

        assert.isEmpty(events);
    });

    it('starts auto-updates', async () => {
        const {instance} = await setupInstance();
        assert.isFalse(instance.isUpdating);

        instance.startAutoUpdates(
            /** If this test becomes flaky, try increasing this number. */
            {
                seconds: 1,
            },
        );

        assert.isTrue(instance.isUpdating);

        /** Wait for the initial update to finish and then another auto update. */
        await waitUntil.isFalse(() => instance.isUpdating);
        await waitUntil.isTrue(() => instance.isUpdating);
        await waitUntil.isFalse(() => instance.isUpdating);

        instance.destroy();
    });

    it('stops auto-updates', async () => {
        const {instance, events} = await setupInstance();
        assert.isFalse(instance.isUpdating);

        instance.startAutoUpdates(
            /** If this test becomes flaky, try increasing this number. */
            {
                seconds: 1,
            },
        );

        await waitUntil.isLengthExactly(2, () => events);

        instance.stopAutoUpdates();

        await wait({
            seconds: 5,
        });

        assert.isLengthExactly(events, 2);

        instance.destroy();
    });

    it('handles a query error', async () => {
        const {instance, events} = await setupInstance(Infinity, FailingMockGitAdapter);

        await assert.throws(() => instance.updateData());

        assert.deepEquals(events, [
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
        ]);
        instance.destroy();
    });

    it('stops auto updating when cost is too high', async () => {
        const HighCostAdapter = defineGitAdapter({
            fetchGitData() {
                return {
                    data: [],
                    queryCost: 200,
                };
            },
            serviceName: 'mock git high cost',
        });

        const {instance, events} = await setupInstance(1, HighCostAdapter);

        instance.startAutoUpdates({
            milliseconds: 100,
        });

        await waitUntil.isTruthy(() =>
            events.find((event) => event.type === gitAdapterEvents.GitUpdatesStoppedEvent.name),
        );

        assert.deepEquals(events, [
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdatesStoppedEvent.name,
                message:
                    "Query cost too high (200), turning off auto-updates for 'mock git high cost'.",
            },
        ]);

        instance.destroy();
    });

    it('stops auto updating with too many failures', async () => {
        const {instance, events} = await setupInstance(1, FailingMockGitAdapter);

        instance.startAutoUpdates({
            milliseconds: 100,
        });

        await waitUntil.isTruthy(() =>
            events.find((event) => event.type === gitAdapterEvents.GitUpdatesStoppedEvent.name),
        );

        assert.deepEquals(events, [
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
            {
                type: gitAdapterEvents.GitUpdatesStoppedEvent.name,
                message:
                    "Query failure rate too high (100%), turning off auto-updates for 'mock git failure'.",
            },
        ]);

        instance.destroy();
    });
    it('fails without auth tokens', async () => {
        const NoAuthAdapter = defineGitAdapter({
            async fetchGitData() {
                await wait({
                    milliseconds: 100,
                });

                return {
                    queryCost: 0,
                    data: [
                        {
                            pullRequests: [],
                            time: getNowInUserTimezone(),
                        },
                    ],
                };
            },
            serviceName: 'mock git no auth',
        });

        const {instance, events} = await setupInstance(100, NoAuthAdapter, true);

        await assert.throws(() => instance.updateData());

        assert.deepEquals(events, [
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: "No auth tokens were found for 'mock git no auth'; no data loaded.",
            },
        ]);
        instance.destroy();
    });

    it('handles a query error', async () => {
        const FailingMockGitAdapter = defineGitAdapter({
            async fetchGitData() {
                await wait({
                    milliseconds: 10,
                });
                throw new Error('Intentional failure.');
            },
            serviceName: 'mock git failure',
        });

        const {instance, events} = await setupInstance(Infinity, FailingMockGitAdapter);

        await assert.throws(() => instance.updateData());

        assert.deepEquals(events, [
            {
                type: gitAdapterEvents.GitUpdateStartEvent.name,
                message: undefined,
            },
            {
                type: gitAdapterEvents.GitUpdateDoneEvent.name,
                message: 'Intentional failure.',
            },
        ]);
        instance.destroy();
    });

    it('skips an updates if they take too long', async () => {
        const LongRunningAdapter = defineGitAdapter({
            async fetchGitData() {
                await wait({
                    seconds: 1,
                });
                return {
                    data: [],
                    queryCost: 1,
                };
            },
            serviceName: 'long running query',
        });

        const {instance, events} = await setupInstance(Infinity, LongRunningAdapter);

        instance.startAutoUpdates({
            milliseconds: 10,
        });

        await waitUntil.isTruthy(() => {
            instance.startAutoUpdates({
                milliseconds: 10,
            });
            return events.find(
                (event) => event.type === gitAdapterEvents.GitUpdateSkippedEvent.name,
            );
        });

        instance.destroy();
    });
});
