import {getNowInUtcTimezone, utcTimezone, type FullDate} from 'date-vir';
import {mockGitBranch} from './git-branch.mock.js';
import {mockGitUser} from './git-user.mock.js';
import {
    PullRequestDisplayStatus,
    PullRequestMergeStatus,
    type PullRequest,
} from './pull-request.js';

export const mockPullRequestDate: FullDate = {
    year: 2024,
    month: 11,
    day: 23,

    hour: 1,
    minute: 2,
    second: 0,
    millisecond: 900,

    timezone: utcTimezone,
};

export const mockPullRequest: PullRequest = {
    authTokenName: 'my token',
    branches: {
        headBranch: {
            ...mockGitBranch,
            branchName: 'head branch',
        },
        targetBranch: {
            ...mockGitBranch,
            branchName: 'target branch',
        },
    },
    changes: {
        additions: 1,
        changedFiles: 1,
        deletions: 1,
    },
    currentUser: {
        hasReviewed: false,
        isCodeOwner: true,
        isPrimaryReviewer: true,
        isAssignee: false,
    },
    dates: {
        closed: undefined,
        created: mockPullRequestDate,
        lastUpdated: mockPullRequestDate,
    },
    id: {
        htmlUrl: 'pr url',
        owner: mockGitUser,
        prId: '123',
        prNumber: '123',
        title: 'test',
        gitServiceName: 'github',
    },
    raw: {},
    fetchDate: getNowInUtcTimezone(),
    status: {
        displayStatus: PullRequestDisplayStatus.Draft,
        checksStatus: {
            failCount: 0,
            inProgressCount: 1,
            successCount: 1,
            totalCount: 2,
        },
        comments: {
            resolved: 1,
            total: 1,
        },
        commitCount: 2,
        hasMergeConflicts: false,
        mergedBy: undefined,
        mergeStatus: PullRequestMergeStatus.Open,
        pullRequestLabels: [],
    },
    users: {
        assignees: {},
        reviewers: {},
    },
};
