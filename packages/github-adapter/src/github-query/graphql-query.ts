import {defineShape, enumShape, optionalShape, unionShape, unknownShape} from 'object-shape-tester';

export const githubGraphqlErrorShape = defineShape({
    extensions: optionalShape(unknownShape()),
    locations: optionalShape([
        {
            line: 0,
            column: 0,
        },
    ]),
    message: '',
    path: optionalShape([unionShape('', 0)]),
    type: optionalShape(''),
    code: optionalShape(''),
});

/**
 * This was pulled out of the actual GraphQL responses. They almost match `NonNullable<
 * components['schemas']['check-run-with-simple-check-suite']['conclusion']> ` from
 * `@octokit/openapi-types` but that type has lowercase values.
 */
export enum GithubGraphqlCheckRunConclusion {
    ActionRequired = 'ACTION_REQUIRED',
    Cancelled = 'CANCELLED',
    Completed = 'COMPLETED',
    Failure = 'FAILURE',
    InProgress = 'IN_PROGRESS',
    Neutral = 'NEUTRAL',
    Pending = 'PENDING',
    Queued = 'QUEUED',
    Skipped = 'SKIPPED',
    Stale = 'STALE',
    StartupFailure = 'STARTUP_FAILURE',
    Success = 'SUCCESS',
    TimedOut = 'TIMED_OUT',
    Waiting = 'WAITING',
}

export enum GithubGraphqlReviewState {
    Approved = 'APPROVED',
    Pending = 'PENDING',
    Commented = 'COMMENTED',
    ChangesRequested = 'CHANGES_REQUESTED',
    Dismissed = 'DISMISSED',
}

export enum GithubMergeableState {
    Mergeable = 'MERGEABLE',
    Conflicting = 'CONFLICTING',
    Unknown = 'UNKNOWN',
}

export const failedCheckRunConclusions = [
    GithubGraphqlCheckRunConclusion.ActionRequired,
    GithubGraphqlCheckRunConclusion.Cancelled,
    GithubGraphqlCheckRunConclusion.Failure,
    GithubGraphqlCheckRunConclusion.Stale,
    GithubGraphqlCheckRunConclusion.StartupFailure,
    GithubGraphqlCheckRunConclusion.TimedOut,
] as const satisfies ReadonlyArray<GithubGraphqlCheckRunConclusion>;

export const successCheckRunConclusions = [
    GithubGraphqlCheckRunConclusion.Completed,
    GithubGraphqlCheckRunConclusion.Neutral,
    GithubGraphqlCheckRunConclusion.Skipped,
    GithubGraphqlCheckRunConclusion.Success,
] as const satisfies ReadonlyArray<GithubGraphqlCheckRunConclusion>;

export const pendingCheckRunConclusions = [
    GithubGraphqlCheckRunConclusion.InProgress,
    GithubGraphqlCheckRunConclusion.Pending,
    GithubGraphqlCheckRunConclusion.Queued,
    GithubGraphqlCheckRunConclusion.Waiting,
] as const satisfies ReadonlyArray<GithubGraphqlCheckRunConclusion>;

const githubUserSearchResponseShape = defineShape({
    login: '',
    avatarUrl: unionShape(undefined, ''),
    teamAvatarUrl: unionShape(undefined, ''),
    url: '',
});
export type GithubUserSearchResponse = typeof githubUserSearchResponseShape.runtimeType;

const githubRunCheckStateShape = defineShape({
    count: 0,
    state: enumShape(GithubGraphqlCheckRunConclusion),
});
export type GithubRunCheckState = typeof githubRunCheckStateShape.runtimeType;

const githubReviewShape = defineShape({
    state: enumShape(GithubGraphqlReviewState),
    author: githubUserSearchResponseShape,
    submittedAt: '',
});

export const githubPullRequestShape = defineShape({
    additions: 0,
    assignees: {
        nodes: [
            githubUserSearchResponseShape,
        ],
    },
    author: githubUserSearchResponseShape,
    baseRef: {
        name: '',
    },
    bodyText: '',
    mergeable: enumShape(GithubMergeableState),
    headRef: {
        name: '',
    },
    labels: unionShape(
        /** `null` means no labels */
        null,
        {
            nodes: [
                {
                    name: '',
                    color: '',
                },
            ],
        },
    ),
    baseRepository: {
        name: '',
        owner: githubUserSearchResponseShape,
        isArchived: false,
        isPrivate: false,
        url: '',
    },
    headRepository: {
        name: '',
        owner: githubUserSearchResponseShape,
        isArchived: false,
        isPrivate: false,
        url: '',
    },
    changedFiles: 0,
    closedAt: unionShape(null, ''),
    commits: {
        nodes: [
            unionShape(
                /** `null` indicates missing the permissions to read "Contents". */
                null,
                {
                    commit: {
                        statusCheckRollup: unionShape(
                            /** `null` indicates lack of permissions to read "Commit statuses". */
                            null,
                            {
                                contexts: {
                                    checkRunCountsByState: [githubRunCheckStateShape],
                                },
                            },
                        ),
                    },
                },
            ),
        ],
        totalCount: 0,
    },
    createdAt: '',
    deletions: 0,
    id: '',
    isDraft: false,
    mergedAt: unionShape(null, ''),
    mergedBy: unionShape(null, githubUserSearchResponseShape),
    number: 0,
    reviewThreads: {
        nodes: [
            {
                isResolved: false,
            },
        ],
    },
    /**
     * Indicates reviews that have been left. Note that this includes previous reviews from users
     * that currently need to re-review. Compare each of these entries with the `reviewRequests`
     * field before using them.
     */
    latestOpinionatedReviews: {
        nodes: [githubReviewShape],
    },
    /** Indicates requests for review that have not been met. */
    reviewRequests: {
        nodes: [
            {
                requestedReviewer: githubUserSearchResponseShape,
            },
        ],
    },
    title: '',
    updatedAt: '',
    url: '',
});
export type GithubPullRequest = typeof githubPullRequestShape.runtimeType;

/**
 * This shape is comes straight from an actual GitHub response to the below GraphQL query. If the
 * query changes, this must change too.
 */
export const githubSearchShape = defineShape({
    rateLimit: {
        cost: 1,
        limit: 5000,
        nodeCount: 0,
        remaining: 0,
        resetAt: '',
        used: 0,
    },
    viewer: githubUserSearchResponseShape,
    search: {
        issueCount: 0,
        pageInfo: {
            endCursor: unionShape('', null),
            hasNextPage: false,
        },
        nodes: [
            githubPullRequestShape,
        ],
    },
});

export type GithubSearch = typeof githubSearchShape.runtimeType;

/**
 * This query determines the above shape definition. If this query changes, make sure to change that
 * shape as well.
 */
export const githubSearchQuery = /* GraphQL */ `
    query ($afterCursor: String) {
        rateLimit {
            cost
            limit
            nodeCount
            remaining
            resetAt
            used
        }
        viewer {
            avatarUrl
            login
            url
        }
        # first 42 = cost of 3
        # first 41 = cost of 2
        search(
            first: 41
            after: $afterCursor
            query: "is:open type:pr archived:false involves:@me"
            type: ISSUE
        ) {
            pageInfo {
                endCursor
                hasNextPage
            }
            issueCount
            nodes {
                ... on PullRequest {
                    number
                    id
                    bodyText
                    isDraft
                    title
                    author {
                        login
                        avatarUrl
                        url
                    }
                    url
                    mergeable
                    headRepository {
                        name
                        owner {
                            login
                            avatarUrl
                            url
                        }
                        isArchived
                        url
                        isPrivate
                    }
                    baseRepository {
                        name
                        owner {
                            login
                            avatarUrl
                            url
                        }
                        isArchived
                        url
                        isPrivate
                    }
                    createdAt
                    updatedAt
                    closedAt
                    mergedAt
                    mergedBy {
                        login
                        avatarUrl
                        url
                    }
                    baseRef {
                        name
                    }
                    headRef {
                        name
                    }
                    labels(first: 5) {
                        nodes {
                            color
                            name
                        }
                    }
                    commits(last: 1) {
                        totalCount
                        nodes {
                            commit {
                                statusCheckRollup {
                                    contexts {
                                        checkRunCountsByState {
                                            count
                                            state
                                        }
                                    }
                                }
                            }
                        }
                    }
                    additions
                    deletions
                    changedFiles
                    assignees(first: 10) {
                        nodes {
                            login
                            avatarUrl
                            url
                        }
                    }
                    reviewThreads(first: 50) {
                        nodes {
                            isResolved
                        }
                    }
                    latestOpinionatedReviews(first: 10) {
                        nodes {
                            author {
                                login
                                avatarUrl
                                url
                            }
                            submittedAt
                            state
                        }
                    }
                    reviewRequests(first: 10) {
                        nodes {
                            requestedReviewer {
                                ... on User {
                                    login
                                    avatarUrl
                                    url
                                }
                                ... on Bot {
                                    login
                                    avatarUrl
                                    url
                                }
                                ... on Team {
                                    name
                                    teamAvatarUrl: avatarUrl
                                    url
                                }
                                ... on Mannequin {
                                    login
                                    avatarUrl
                                    url
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;
