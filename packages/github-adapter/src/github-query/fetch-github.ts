import {assert} from '@augment-vir/assert';
import type {AuthToken} from '@review-vir/adapter-core';
import {sum} from '../augments/sum.js';
import {fetchGithubGraphql} from './fetch-github-graphql.js';
import {githubSearchQuery, githubSearchShape, type GithubSearch} from './graphql-query.js';

export async function fetchGithubPullRequests(
    authToken: Readonly<AuthToken>,
    /** This is an input so it can be mocked. */
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<GithubSearch> {
    return combineResponseData(
        await fetchGithubGraphql({
            authToken,
            createQuery: (cursor) => {
                return {
                    query: githubSearchQuery,
                    variables: {
                        afterCursor: cursor,
                    },
                };
            },
            responseShape: githubSearchShape,
            getPageInfo: (data) => {
                return data.search.pageInfo;
            },
            fetch,
        }),
    );
}

function combineResponseData(responses: ReadonlyArray<Readonly<GithubSearch>>): GithubSearch {
    const lastResponse = responses[responses.length - 1];

    assert.isDefined(lastResponse);

    return {
        rateLimit: {
            ...lastResponse.rateLimit,
            cost: responses
                .map((response) => response.rateLimit.cost)
                .reduce(
                    (total, current) =>
                        sum({
                            a: total,
                            b: current,
                        }),
                    0,
                ),
            nodeCount: responses
                .map((response) => response.rateLimit.nodeCount)
                .reduce(
                    (total, current) =>
                        sum({
                            a: total,
                            b: current,
                        }),
                    0,
                ),
        },
        viewer: lastResponse.viewer,
        search: {
            issueCount: lastResponse.search.issueCount,
            pageInfo: lastResponse.search.pageInfo,
            nodes: responses.flatMap((response) => response.search.nodes),
        },
    };
}
