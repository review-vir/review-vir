export const mockGithubSearch = {
    rateLimit: {
        /** This cost is real. */
        cost: 2,
        limit: 5000,
        nodeCount: 123,
        remaining: 5000,
        resetAt: '2024-12-01T00:00:00Z',
        used: 0,
    },
    viewer: {
        avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
        login: 'electrovir',
        url: 'https://github.com/electrovir',
    },
    search: {
        issueCount: 1,
        pageInfo: {
            endCursor: 'fake cursor',
            hasNextPage: false,
        },
        nodes: [
            {
                number: 1,
                id: 'PR_1',
                body: '<!-- code owners start -->\n**Code owners**:\n@electrovir\n<details>\n<summary>Owned files</summary>\n\n- [packages/common/src/index.ts](https://github.com/review-vir/fake-repo/pull/1/files#diff-abc)\n\n</details>\n<!-- code owners end -->\nPrimary Reviewer: @electrovir\nChanges\n\n\nstuff',
                bodyText:
                    'Primary Reviewer: @electrovir\nChanges\n\n\nstuff\n\ncode owner: @electrovir',
                isDraft: false,
                title: 'fake PR',
                author: {
                    login: 'user 1',
                    avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                    url: 'https://github.com/electrovir',
                },
                url: 'https://github.com/review-vir/fake-repo/pull/1',
                mergeable: 'MERGEABLE',
                headRepository: {
                    name: 'fake-repo',
                    owner: {
                        login: 'review-vir',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                        url: 'https://github.com/review-vir',
                    },
                    isArchived: false,
                    url: 'https://github.com/review-vir/fake-repo',
                    isPrivate: true,
                },
                baseRepository: {
                    name: 'fake-repo',
                    owner: {
                        login: 'review-vir',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                        url: 'https://github.com/review-vir',
                    },
                    isArchived: false,
                    url: 'https://github.com/review-vir/fake-repo',
                    isPrivate: true,
                },
                createdAt: '2024-12-01T00:00:00Z',
                updatedAt: '2024-12-01T00:00:00Z',
                closedAt: null,
                mergedAt: null,
                mergedBy: null,
                baseRef: {
                    name: 'dev',
                },
                headRef: {
                    name: '3261-JWA-turn-off-call-attempts',
                },
                labels: {
                    nodes: [
                        {
                            color: 'red',
                            name: 'emergency',
                        },
                    ],
                },
                commits: {
                    totalCount: 10,
                    nodes: [
                        {
                            commit: {
                                statusCheckRollup: {
                                    contexts: {
                                        checkRunCountsByState: [
                                            {
                                                count: 0,
                                                state: 'ACTION_REQUIRED',
                                            },
                                            {
                                                count: 0,
                                                state: 'CANCELLED',
                                            },
                                            {
                                                count: 0,
                                                state: 'COMPLETED',
                                            },
                                            {
                                                count: 1,
                                                state: 'FAILURE',
                                            },
                                            {
                                                count: 0,
                                                state: 'IN_PROGRESS',
                                            },
                                            {
                                                count: 5,
                                                state: 'NEUTRAL',
                                            },
                                            {
                                                count: 0,
                                                state: 'PENDING',
                                            },
                                            {
                                                count: 1,
                                                state: 'QUEUED',
                                            },
                                            {
                                                count: 0,
                                                state: 'SKIPPED',
                                            },
                                            {
                                                count: 0,
                                                state: 'STALE',
                                            },
                                            {
                                                count: 0,
                                                state: 'STARTUP_FAILURE',
                                            },
                                            {
                                                count: 16,
                                                state: 'SUCCESS',
                                            },
                                            {
                                                count: 0,
                                                state: 'TIMED_OUT',
                                            },
                                            {
                                                count: 0,
                                                state: 'WAITING',
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
                additions: 3,
                deletions: 52,
                changedFiles: 2,
                assignees: {
                    nodes: [
                        {
                            login: 'user 1',
                            avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                            url: 'https://github.com/electrovir',
                        },
                    ],
                },
                reviewThreads: {
                    nodes: [],
                },
                latestOpinionatedReviews: {
                    nodes: [],
                },
                reviewRequests: {
                    nodes: [
                        {
                            requestedReviewer: {
                                login: 'user 2',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                        {
                            requestedReviewer: {
                                login: 'user 3',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                        {
                            requestedReviewer: {
                                login: 'user 4',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                        {
                            requestedReviewer: {
                                login: 'user 5',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                    ],
                },
            },
            {
                number: 2,
                id: 'PR_2',
                body: 'This PR has some already submitted reviews.',
                bodyText: 'This PR has some already submitted reviews.',
                isDraft: false,
                title: 'with submitted reviews',
                author: {
                    login: 'user 2',
                    avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                    url: 'https://github.com/electrovir',
                },
                url: 'https://github.com/review-vir/fake-repo/pull/2',
                mergeable: 'MERGEABLE',
                headRepository: {
                    name: 'fake-repo',
                    owner: {
                        login: 'review-vir',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                        url: 'https://github.com/review-vir',
                    },
                    isArchived: false,
                    url: 'https://github.com/review-vir/fake-repo',
                    isPrivate: true,
                },
                baseRepository: {
                    name: 'fake-repo',
                    owner: {
                        login: 'review-vir',
                        avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                        url: 'https://github.com/review-vir',
                    },
                    isArchived: false,
                    url: 'https://github.com/review-vir/fake-repo',
                    isPrivate: true,
                },
                createdAt: '2024-12-01T00:00:00Z',
                updatedAt: '2024-12-01T00:00:00Z',
                closedAt: null,
                mergedAt: null,
                mergedBy: null,
                baseRef: {
                    name: 'dev',
                },
                headRef: {
                    name: 'time-based-auto-scaling',
                },
                labels: {
                    nodes: [],
                },
                commits: {
                    totalCount: 3,
                    nodes: [
                        {
                            commit: {
                                statusCheckRollup: {
                                    contexts: {
                                        checkRunCountsByState: [
                                            {
                                                count: 0,
                                                state: 'ACTION_REQUIRED',
                                            },
                                            {
                                                count: 0,
                                                state: 'CANCELLED',
                                            },
                                            {
                                                count: 0,
                                                state: 'COMPLETED',
                                            },
                                            {
                                                count: 3,
                                                state: 'FAILURE',
                                            },
                                            {
                                                count: 0,
                                                state: 'IN_PROGRESS',
                                            },
                                            {
                                                count: 5,
                                                state: 'NEUTRAL',
                                            },
                                            {
                                                count: 0,
                                                state: 'PENDING',
                                            },
                                            {
                                                count: 0,
                                                state: 'QUEUED',
                                            },
                                            {
                                                count: 8,
                                                state: 'SKIPPED',
                                            },
                                            {
                                                count: 0,
                                                state: 'STALE',
                                            },
                                            {
                                                count: 0,
                                                state: 'STARTUP_FAILURE',
                                            },
                                            {
                                                count: 5,
                                                state: 'SUCCESS',
                                            },
                                            {
                                                count: 0,
                                                state: 'TIMED_OUT',
                                            },
                                            {
                                                count: 0,
                                                state: 'WAITING',
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
                additions: 186,
                deletions: 0,
                changedFiles: 6,
                assignees: {
                    nodes: [
                        {
                            login: 'user 2',
                            avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                            url: 'https://github.com/electrovir',
                        },
                    ],
                },
                reviewThreads: {
                    nodes: [
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                        {
                            isResolved: false,
                        },
                    ],
                },
                latestOpinionatedReviews: {
                    nodes: [
                        {
                            author: {
                                login: 'user 3',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                            submittedAt: '2024-12-01T00:00:00Z',
                            state: 'CHANGES_REQUESTED',
                        },
                        {
                            author: {
                                login: 'electrovir',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                            submittedAt: '2024-12-01T00:00:00Z',
                            state: 'CHANGES_REQUESTED',
                        },
                    ],
                },
                reviewRequests: {
                    nodes: [
                        {
                            requestedReviewer: {
                                login: 'user 5',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                        {
                            requestedReviewer: {
                                login: 'user 6',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                        {
                            requestedReviewer: {
                                login: 'user 7',
                                avatarUrl: 'https://avatars.githubusercontent.com/u/157386748?v=4',
                                url: 'https://github.com/electrovir',
                            },
                        },
                    ],
                },
            },
        ],
    },
};
