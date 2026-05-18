import {log, type ArrayElement, type Overwrite} from '@augment-vir/common';
import {fetchGithubGraphql} from '@review-vir/github-adapter';
import {createFullDateInUserTimezone, type FullDate} from 'date-vir';
import {defineShape} from 'object-shape-tester';
import {type ServiceAuthTokens} from './auth-tokens.js';

const currentYear = new Date().getFullYear();

const annualReviewDataShape = defineShape({
    viewer: {
        login: '',
    },
    rateLimit: {
        cost: -1,
        limit: -1,
        nodeCount: -1,
        remaining: -1,
        resetAt: '',
        used: -1,
    },
    search: {
        pageInfo: {
            endCursor: '',
            hasNextPage: false,
        },
        issueCount: -1,
        nodes: [
            {
                number: -1,
                id: '',
                title: '',
                url: '',
                createdAt: '',
                additions: -1,
                deletions: -1,
                changedFiles: -1,
            },
        ],
    },
});

export type AnnualReviewPullRequest = Overwrite<
    ArrayElement<(typeof annualReviewDataShape.runtimeType)['search']['nodes']>,
    {
        createdAt: FullDate;
    }
>;

export async function fetchAnnualReview(
    authTokens: ServiceAuthTokens,
): Promise<AnnualReviewPullRequest[]> {
    let pageCount = 1;

    const results = await Promise.all(
        authTokens.GitHub.map(async (authToken) => {
            return fetchGithubGraphql(
                authToken,
                (cursor) => {
                    log.faint(
                        `Loading ${authToken.authTokenName} annual review page ${pageCount}...`,
                    );

                    pageCount++;

                    return {
                        query: /* GraphQL */ `
                            query ($cursor: String, $search: String!) {
                                viewer {
                                    login
                                }
                                rateLimit {
                                    cost
                                    limit
                                    nodeCount
                                    remaining
                                    resetAt
                                    used
                                }
                                search(first: 99, after: $cursor, query: $search, type: ISSUE) {
                                    pageInfo {
                                        endCursor
                                        hasNextPage
                                    }
                                    issueCount
                                    nodes {
                                        ... on PullRequest {
                                            number
                                            id
                                            title
                                            url
                                            createdAt
                                            additions
                                            deletions
                                            changedFiles
                                        }
                                    }
                                }
                            }
                        `,
                        variables: {
                            cursor,
                            search: `is:pr assignee:@me is:merged created:>${currentYear}-01-01 sort:created-desc`,
                        },
                    };
                },
                annualReviewDataShape,
                ({search}) => {
                    return search.pageInfo;
                },
            );
        }),
    );

    const allPullRequests = results.reduce(
        (accum, result) => {
            accum.push(...result.flatMap((data) => data.search.nodes));
            return accum;
        },
        [] as ArrayElement<(typeof annualReviewDataShape.runtimeType)['search']['nodes']>[],
    );

    return allPullRequests.map((githubPullRequest) => {
        (githubPullRequest as unknown as AnnualReviewPullRequest).createdAt =
            createFullDateInUserTimezone(githubPullRequest.createdAt);

        return githubPullRequest as unknown as AnnualReviewPullRequest;
    });
}
