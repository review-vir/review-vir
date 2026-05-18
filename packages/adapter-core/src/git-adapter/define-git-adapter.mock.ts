import {wait} from '@augment-vir/common';
import {getNowInUserTimezone} from 'date-vir';
import {defineGitAdapter} from './define-git-adapter.js';

export const MockGitAdapter = defineGitAdapter({
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
    serviceName: 'mock git',
});
