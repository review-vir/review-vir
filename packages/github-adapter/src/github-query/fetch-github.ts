import {assert, check, checkWrap} from '@augment-vir/assert';
import {RateLimitedError, type AuthToken} from '@review-vir/adapter-core';
import {assertValidShape} from 'object-shape-tester';
import {sum} from '../augments/sum.js';
import {
    extractRateLimitResetDate,
    fetchGithubGraphql,
    isRateLimitHttpResponse,
} from './fetch-github-graphql.js';
import {
    failedCheckRunConclusions,
    GithubMergeStateStatus,
    githubRestPullRequestShape,
    githubSearchQuery,
    githubSearchShape,
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

    /** Merge states only matter for failures, the only counts that re-run check runs inflate. */
    const mergeStates = await Promise.all(
        searchData.search.nodes.filter(hasFailedChecks).map(async (pullRequest) => {
            return {
                id: pullRequest.id,
                mergeStateStatus: await fetchMergeStateStatus({
                    authToken,
                    pullRequest,
                    fetch,
                }),
            };
        }),
    );

    return {
        ...searchData,
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

function hasFailedChecks(pullRequest: Readonly<GithubPullRequest>) {
    return !!pullRequest.commits.nodes[0]?.commit.statusCheckRollup?.contexts.checkRunCountsByState.some(
        (checkState) => {
            return check.hasValue(failedCheckRunConclusions, checkState.state) && checkState.count;
        },
    );
}

/**
 * Uses the REST API, one pull request per request, because GraphQL returns `BLOCKED` for pull
 * requests that aren't blocked when a single request asks for the merge state of 3 or more pull
 * requests. REST requests also don't count towards GraphQL query cost.
 */
async function fetchMergeStateStatus({
    authToken,
    pullRequest,
    fetch,
}: Readonly<{
    authToken: Readonly<AuthToken>;
    pullRequest: Readonly<GithubPullRequest>;
    fetch: typeof globalThis.fetch;
}>) {
    const response = await fetch(
        `https://api.github.com/repos/${pullRequest.baseRepository.owner.login}/${pullRequest.baseRepository.name}/pulls/${pullRequest.number}`,
        {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `bearer ${authToken.authTokenSecret}`,
            },
        },
    );
    if (!response.ok) {
        if (isRateLimitHttpResponse(response)) {
            throw new RateLimitedError(
                `GitHub API rate limit exceeded: ${response.status} ${response.statusText}`,
                extractRateLimitResetDate(response.headers),
            );
        }
        throw new Error(
            `GitHub pull request fetch failed for '${pullRequest.url}': ${response.status}, ${response.statusText}`,
        );
    }
    const data: unknown = await response.json();
    assertValidShape(data, githubRestPullRequestShape, {
        allowExtraKeys: true,
    });

    return checkWrap.isEnumValue(data.mergeable_state.toUpperCase(), GithubMergeStateStatus);
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
