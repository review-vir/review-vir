import {assert, check} from '@augment-vir/assert';
import {chunkArray} from '@augment-vir/common';
import type {AuthToken} from '@review-vir/adapter-core';
import {sum} from '../augments/sum.js';
import {fetchGithubGraphql} from './fetch-github-graphql.js';
import {
    failedCheckRunConclusions,
    githubMergeStateQuery,
    githubMergeStateShape,
    githubSearchQuery,
    githubSearchShape,
    type GithubMergeState,
    type GithubPullRequest,
    type GithubSearch,
} from './graphql-query.js';

export async function fetchGithubPullRequests(
    authToken: Readonly<AuthToken>,
    /** This is an input so it can be mocked. */
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<GithubSearch> {
    const searchData = combineResponseData(
        await fetchGithubGraphql({
            authToken,
            createQuery(cursor) {
                return {
                    query: githubSearchQuery,
                    variables: {
                        afterCursor: cursor,
                    },
                };
            },
            responseShape: githubSearchShape,
            getPageInfo(data) {
                return data.search.pageInfo;
            },
            fetch,
        }),
    );

    /**
     * Merge states only matter for failures, the only counts that re-run check runs inflate. Each
     * query costs 1 no matter how many ids it has, up to GitHub's limit of 100, so they aren't
     * split up further to keep the total query cost down.
     */
    const mergeStateResponses = await Promise.all(
        chunkArray(searchData.search.nodes.filter(hasFailedChecks), {
            chunkSize: 100,
        }).map(async (pullRequests) => {
            return await fetchGithubGraphql({
                authToken,
                createQuery() {
                    return {
                        query: githubMergeStateQuery,
                        variables: {
                            pullRequestIds: pullRequests.map((pullRequest) => pullRequest.id),
                        },
                    };
                },
                responseShape: githubMergeStateShape,
                fetch,
            });
        }),
    );

    return addMergeStates(searchData, mergeStateResponses.flat());
}

function hasFailedChecks(pullRequest: Readonly<GithubPullRequest>) {
    return !!pullRequest.commits.nodes[0]?.commit.statusCheckRollup?.contexts.checkRunCountsByState.some(
        (checkState) => {
            return check.hasValue(failedCheckRunConclusions, checkState.state) && checkState.count;
        },
    );
}

function addMergeStates(
    searchData: Readonly<GithubSearch>,
    mergeStateResponses: ReadonlyArray<Readonly<GithubMergeState>>,
): GithubSearch {
    const mergeStates = mergeStateResponses.flatMap((response) => {
        return response.nodes.filter(check.isTruthy);
    });

    return {
        ...searchData,
        rateLimit: {
            ...searchData.rateLimit,
            cost: sum({
                a: searchData.rateLimit.cost,
                b: mergeStateResponses.reduce((total, response) => {
                    return sum({
                        a: total,
                        b: response.rateLimit.cost,
                    });
                }, 0),
            }),
        },
        search: {
            ...searchData.search,
            nodes: searchData.search.nodes.map((pullRequest) => {
                return {
                    ...pullRequest,
                    mergeStateStatus: mergeStates.find((mergeState) => {
                        return mergeState.id === pullRequest.id;
                    })?.mergeStateStatus,
                };
            }),
        },
    };
}
function combineResponseData(responses: ReadonlyArray<Readonly<GithubSearch>>): GithubSearch {
    const lastResponse = responses[responses.length - 1];

    assert.isDefined(lastResponse);

    return {
        rateLimit: {
            ...lastResponse.rateLimit,
            cost: responses
                .map((response) => response.rateLimit.cost)
                .reduce((total, current) => {
                    return sum({
                        a: total,
                        b: current,
                    });
                }, 0),
            nodeCount: responses
                .map((response) => response.rateLimit.nodeCount)
                .reduce((total, current) => {
                    return sum({
                        a: total,
                        b: current,
                    });
                }, 0),
        },
        viewer: lastResponse.viewer,
        search: {
            issueCount: lastResponse.search.issueCount,
            pageInfo: lastResponse.search.pageInfo,
            nodes: responses.flatMap((response) => response.search.nodes),
        },
    };
}
