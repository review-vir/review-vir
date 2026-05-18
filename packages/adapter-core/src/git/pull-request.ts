import {fullDateShape} from 'date-vir';
import {defineShape, enumShape, recordShape, unionShape, unknownShape} from 'object-shape-tester';
import {gitBranchShape} from './git-branch.js';
import {gitUserShape} from './git-user.js';

export enum PullRequestMergeStatus {
    Draft = 'draft',
    Merged = 'merged',
    Open = 'open',
    Rejected = 'rejected',
}

export enum PullRequestReviewStatus {
    Accepted = 'accepted',
    Rejected = 'rejected',
    Pending = 'pending',
}

export enum PullRequestDisplayStatus {
    /** Affects all pull requests. */

    Draft = 'draft',
    ReadyToMerge = 'ready-to-merge',
    /** Waiting either for builds or reviews. */
    Waiting = 'waiting',

    /** Affects only reviewer pull requests. */

    PrimaryReviewer = 'primary-reviewer',
    CodeOwner = 'code-owner',

    /** Affects only assigned pull requests. */

    MergeConflicts = 'merge-conflicts',
    BuildFailureInProgress = 'build-failure-in-progress',
    BuildFailureFinished = 'build-failure-finished',
    UnresolvedComments = 'unresolved-comments',
}

const pullRequestChecksShape = defineShape({
    successCount: 0,
    failCount: 0,
    inProgressCount: 0,
    totalCount: 0,
});
export type PullRequestChecks = typeof pullRequestChecksShape.runtimeType;

export const pullRequestReviewShape = defineShape({
    user: gitUserShape,
    isPrimaryReviewer: false,
    isCodeOwner: false,
    reviewStatus: enumShape(PullRequestReviewStatus),
});
export type PullRequestReview = typeof pullRequestReviewShape.runtimeType;

export const pullRequestShape = defineShape({
    id: {
        htmlUrl: '',
        prId: '',
        prNumber: '',
        title: '',
        owner: gitUserShape,
        gitServiceName: '',
    },
    authTokenName: '',
    branches: {
        /** The branch that the PR is coming from. */
        headBranch: gitBranchShape,
        /** The branch that the PR is merging into. */
        targetBranch: gitBranchShape,
    },
    dates: {
        created: fullDateShape,
        lastUpdated: fullDateShape,
        closed: unionShape(undefined, fullDateShape),
    },
    status: {
        displayStatus: enumShape(PullRequestDisplayStatus),
        checksStatus: unionShape(pullRequestChecksShape, undefined),
        comments: {
            resolved: 0,
            total: 0,
        },
        commitCount: 0,
        mergeStatus: enumShape(PullRequestMergeStatus),
        mergedBy: unionShape(undefined, gitUserShape),
        pullRequestLabels: [
            {
                name: '',
                color: '',
            },
        ],
        hasMergeConflicts: false,
    },
    currentUser: {
        isAssignee: false,
        isPrimaryReviewer: false,
        isCodeOwner: false,
        hasReviewed: false,
    },
    changes: {
        additions: 0,
        deletions: 0,
        changedFiles: 0,
    },
    users: {
        reviewers: recordShape({
            keys: '',
            values: pullRequestReviewShape,
        }),
        assignees: recordShape({
            keys: '',
            values: gitUserShape,
        }),
    },
    raw: unknownShape(),
    fetchDate: fullDateShape,
});

export type PullRequest = typeof pullRequestShape.runtimeType;
