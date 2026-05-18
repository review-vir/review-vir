import {mapObjectValues, mergeDeep} from '@augment-vir/common';
import {describe, snapshotCases} from '@augment-vir/test';
import {calculateRelativeDate} from 'date-vir';
import {mockGitUser} from './git-user.mock.js';
import {
    createChainedPullRequests,
    organizePullRequests,
    type ChainedPullRequest,
} from './organize-pull-requests.js';
import {PullRequestMergeStatus, PullRequestReviewStatus, type PullRequest} from './pull-request.js';
import {mockPullRequest, mockPullRequestDate} from './pull-request.mock.js';

describe(createChainedPullRequests.name, () => {
    function testCreateChainedPullRequests(...args: Parameters<typeof createChainedPullRequests>) {
        return createChainedPullRequests(...args).map((result) => result.pullRequest.id.prId);
    }

    snapshotCases(testCreateChainedPullRequests, [
        {
            it: 'sorts oldest updates to the top',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '2',
                    },
                    dates: {
                        lastUpdated: calculateRelativeDate(mockPullRequestDate, {
                            days: -2,
                        }),
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 2',
                        },
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '3',
                    },
                    dates: {
                        lastUpdated: calculateRelativeDate(mockPullRequestDate, {
                            days: -1,
                        }),
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 3',
                        },
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '1',
                    },
                    dates: {
                        lastUpdated: calculateRelativeDate(mockPullRequestDate, {
                            days: -3,
                        }),
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 1',
                        },
                    },
                }),
            ],
        },
        {
            it: 'sorts needs review to the top',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '2',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 2',
                        },
                    },
                    currentUser: {
                        hasReviewed: true,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '3',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 3',
                        },
                    },
                    currentUser: {
                        hasReviewed: true,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '1',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 1',
                        },
                    },
                    currentUser: {
                        hasReviewed: false,
                    },
                }),
            ],
        },
        {
            it: 'sorts primary review to top',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '2',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 2',
                        },
                    },
                    currentUser: {
                        hasReviewed: false,
                        isPrimaryReviewer: false,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '3',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 3',
                        },
                    },
                    currentUser: {
                        hasReviewed: true,
                        isPrimaryReviewer: true,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '1',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 1',
                        },
                    },
                    currentUser: {
                        hasReviewed: false,
                        isPrimaryReviewer: true,
                    },
                }),
            ],
        },
        {
            it: 'sorts drafts to the bottom',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '3',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 3',
                        },
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Draft,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '1',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 1',
                        },
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '2',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 2',
                        },
                    },
                }),
            ],
        },
        {
            it: 'maintains sort with identical pull requests',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '1',
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Open,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '2',
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Open,
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: '3',
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Open,
                    },
                }),
            ],
        },
    ]);
});

describe(organizePullRequests.name, () => {
    function unwrapPullRequests(pullRequest: ChainedPullRequest | PullRequest): unknown {
        if ('pullRequest' in pullRequest) {
            pullRequest.pullRequest;
            return {
                pullRequest: unwrapPullRequests(pullRequest.pullRequest),
                isChained: pullRequest.isChained,
                children: pullRequest.children.map((childPullRequest) =>
                    unwrapPullRequests(childPullRequest),
                ),
            };
        } else {
            return pullRequest.id.prId;
        }
    }

    function testOrganizePullRequests(...args: Parameters<typeof organizePullRequests>) {
        const pullRequests = organizePullRequests(...args);

        return mapObjectValues(pullRequests, (ownerName, ownedPullRequests) => {
            return {
                chainedPullRequests: mapObjectValues(
                    ownedPullRequests.pullRequests,
                    (key, pullRequests) => {
                        return pullRequests.map((pullRequest) => {
                            return unwrapPullRequests(pullRequest);
                        });
                    },
                ),
            };
        });
    }

    const mockCurrentUserName = 'derp';
    snapshotCases(testOrganizePullRequests, [
        {
            it: 'organizes pull requests',
            input: [
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'ignored because no assignees or reviewers',
                    },
                    users: {
                        assignees: {},
                        reviewers: {},
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'pending user review',
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isCodeOwner: false,
                                isPrimaryReviewer: false,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                // should be head of chain
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'head of chain 1',
                    },
                    branches: {
                        headBranch: {
                            branchName: 'head 1',
                        },
                    },
                    currentUser: {
                        isPrimaryReviewer: false,
                        isCodeOwner: false,
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isPrimaryReviewer: false,
                                isCodeOwner: false,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                // should be chained
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'chain 1 child 1',
                    },
                    branches: {
                        targetBranch: {
                            branchName: 'head 1',
                        },
                    },
                    dates: {
                        lastUpdated: calculateRelativeDate(mockPullRequestDate, {
                            days: 1,
                        }),
                    },
                    currentUser: {
                        isPrimaryReviewer: false,
                        isCodeOwner: false,
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isPrimaryReviewer: false,
                                isCodeOwner: false,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                // should not be chained because it's from a different repo
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'not chained',
                    },
                    branches: {
                        targetBranch: {
                            branchName: 'head 1',
                            repo: {
                                repoName: 'some other repo',
                            },
                        },
                    },
                    currentUser: {
                        isPrimaryReviewer: false,
                        isCodeOwner: true,
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isPrimaryReviewer: false,
                                isCodeOwner: true,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                // should be ignored because it's merged
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'merged',
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Merged,
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isPrimaryReviewer: false,
                                isCodeOwner: true,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                // should be ignored because it's rejected
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'rejected',
                    },
                    status: {
                        mergeStatus: PullRequestMergeStatus.Rejected,
                    },
                    users: {
                        assignees: {},
                        reviewers: {
                            [mockCurrentUserName]: {
                                user: mockGitUser,
                                isPrimaryReviewer: false,
                                isCodeOwner: true,
                                reviewStatus: PullRequestReviewStatus.Pending,
                            },
                        },
                    },
                }),
                mergeDeep(mockPullRequest, {
                    id: {
                        prId: 'assigned',
                    },
                    users: {
                        assignees: {
                            [mockCurrentUserName]: mockGitUser,
                        },
                        reviewers: {},
                    },
                }),
            ],
        },
    ]);
});
