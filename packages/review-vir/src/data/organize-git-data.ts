import {organizePullRequests, type PullRequestsByOwner} from '@review-vir/adapter-core';
import {isDateAfter, type FullDate} from 'date-vir';
import {type AllServiceGitData} from './all-adapters.js';

export function organizeGitData(allData: AllServiceGitData): PullRequestsByOwner {
    const allPullRequests = Object.values(allData)
        .flat()
        .flatMap((entry) => entry.pullRequests);

    return organizePullRequests(allPullRequests);
}

/**
 * The earliest time at which any of the currently-loaded data was fetched. `GitData.time` is only
 * set when a fetch actually succeeds (and is persisted in the cache), so this reflects the last
 * successful update rather than the moment the data happened to be organized.
 */
export function getEarliestUpdateTime(allData: AllServiceGitData): FullDate | undefined {
    return Object.values(allData)
        .flat()
        .reduce((earliest: FullDate | undefined, entry) => {
            if (
                !earliest ||
                isDateAfter({
                    fullDate: earliest,
                    relativeTo: entry.time,
                })
            ) {
                return entry.time;
            }
            return earliest;
        }, undefined);
}
