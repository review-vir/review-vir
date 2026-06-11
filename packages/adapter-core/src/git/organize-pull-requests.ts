import {getOrSet, log, mapObjectValues, type Values} from '@augment-vir/common';
import {type FullDate, isDateAfter} from 'date-vir';
import {type GitUser} from './git-user.js';
import {type PullRequest, PullRequestMergeStatus} from './pull-request.js';

export type PullRequestsByStatus = {
    /** Pull Request for which the current user is a reviewer. */
    reviewer: ReadonlyArray<Readonly<ChainedPullRequest>>;
    /**
     * Pull Request for which the current user is an assignee. (This takes precedence over
     * `reviewer`.
     */
    assigned: ReadonlyArray<Readonly<ChainedPullRequest>>;
};

export function countChainedPullRequests(
    chainedPullRequests: ReadonlyArray<Readonly<ChainedPullRequest>>,
) {
    const counts = {
        total: 0,
        notReviewed: 0,
    };

    chainedPullRequests.forEach(({children, pullRequest}) => {
        counts.total++;
        if (!pullRequest.currentUser.hasReviewed) {
            counts.notReviewed++;
        }

        const childCounts = countChainedPullRequests(children);
        counts.total += childCounts.total;
        counts.notReviewed += childCounts.notReviewed;
    });

    return counts;
}

export type PullRequestsByOwner = {
    [OwnerName in string]: {
        totalCount: number;
        owner: GitUser;
        reviewers: Record<string, {count: number; user: GitUser}>;
        pullRequests: PullRequestsByStatus;
    };
};

export type ChainedPullRequest = {
    needsChainedReviews: boolean;
    latestChainedUpdate: FullDate;
    pullRequest: PullRequest;
    children: ChainedPullRequest[];
    isChained: boolean;
};

export function organizePullRequests(
    pullRequests: ReadonlyArray<Readonly<PullRequest>>,
): PullRequestsByOwner {
    const rawPullRequests: {
        [OwnerName in string]: {
            owner: GitUser;
            totalCount: number;
            pullRequests: {
                reviewer: PullRequest[];
                assigned: PullRequest[];
            };
            reviewers: Record<string, {count: number; user: GitUser}>;
        };
    } = {};

    const allPullRequestIds: Set<string> = new Set();

    pullRequests.forEach((pullRequest) => {
        const organizedRawPullRequests = getOrSet(
            rawPullRequests,
            pullRequest.id.owner.username,
            () => {
                return {
                    owner: pullRequest.id.owner,
                    totalCount: 0,
                    pullRequests: {
                        assigned: [],
                        reviewer: [],
                    },
                    reviewers: {},
                };
            },
        );

        const pullRequestId = `${pullRequest.id.gitServiceName}:${pullRequest.id.prId}`;

        if (allPullRequestIds.has(pullRequestId)) {
            log.error(`Ignoring duplicate pull request: ${pullRequestId}`, pullRequest);
            return;
        }

        allPullRequestIds.add(pullRequestId);

        if (
            pullRequest.status.mergeStatus === PullRequestMergeStatus.Merged ||
            pullRequest.status.mergeStatus === PullRequestMergeStatus.Rejected
        ) {
            return;
        } else if (pullRequest.currentUser.isAssignee) {
            organizedRawPullRequests.pullRequests.assigned.push(pullRequest);
        } else {
            organizedRawPullRequests.pullRequests.reviewer.push(pullRequest);
        }

        Object.values(pullRequest.users.reviewers).forEach((reviewer) => {
            const reviewerWithCount = getOrSet(
                organizedRawPullRequests.reviewers,
                reviewer.user.username,
                () => {
                    return {
                        count: 0,
                        user: reviewer.user,
                    };
                },
            );

            if (reviewer.isCodeOwner || reviewer.isPrimaryReviewer) {
                reviewerWithCount.count++;
            }
        });
        organizedRawPullRequests.totalCount++;
    });

    const chainedPullRequestsByOwner = mapObjectValues(
        rawPullRequests,
        (ownerName, {pullRequests, ...rest}): Values<PullRequestsByOwner> => {
            return {
                pullRequests: mapObjectValues(pullRequests, (reviewType, pullRequests) => {
                    return createChainedPullRequests(pullRequests);
                }),
                ...rest,
            };
        },
    );

    return chainedPullRequestsByOwner;
}

export function createChainedPullRequests(
    pullRequests: ReadonlyArray<PullRequest>,
): ChainedPullRequest[] {
    const chainedPullRequests = pullRequests.reduce(
        (accum, pullRequest) => {
            const pullRequestsWithCurrentHead = getOrSet(
                accum,
                [
                    pullRequest.branches.headBranch.repo.repoName,
                    pullRequest.branches.headBranch.branchName,
                ].join('/'),
                () => [],
            );

            pullRequestsWithCurrentHead.push({
                needsChainedReviews: !pullRequest.currentUser.hasReviewed,
                latestChainedUpdate: pullRequest.dates.lastUpdated,
                pullRequest,
                children: [],
                isChained: false,
            });

            return accum;
        },
        {} as Record<string, ChainedPullRequest[]>,
    );

    Object.values(chainedPullRequests).forEach((subPullRequests) => {
        subPullRequests.forEach((pullRequest) => {
            const targetPullRequests = chainedPullRequests[
                [
                    pullRequest.pullRequest.branches.targetBranch.repo.repoName,
                    pullRequest.pullRequest.branches.targetBranch.branchName,
                ].join('/')
            ]?.filter(
                (pullRequest) =>
                    /**
                     * Remove branches pull requests that target themselves because
                     *
                     * 1. That makes no sense
                     * 2. It'll mess up all our logic
                     * 3. It'll create circular references
                     */
                    pullRequest.pullRequest.branches.headBranch.branchName !==
                    pullRequest.pullRequest.branches.targetBranch.branchName,
            );

            if (targetPullRequests) {
                pullRequest.isChained = true;

                targetPullRequests.forEach((targetPullRequest) => {
                    if (!pullRequest.pullRequest.currentUser.hasReviewed) {
                        targetPullRequest.needsChainedReviews = true;
                    }
                    if (
                        isDateAfter({
                            fullDate: pullRequest.pullRequest.dates.lastUpdated,
                            relativeTo: targetPullRequest.latestChainedUpdate,
                        })
                    ) {
                        targetPullRequest.latestChainedUpdate =
                            pullRequest.pullRequest.dates.lastUpdated;
                    }

                    targetPullRequest.children.push(pullRequest);
                });
            }
        });
    });

    return Object.values(chainedPullRequests)
        .flat()
        .filter(
            (pullRequest) =>
                /**
                 * Remove all chained pull requests because they will be included as children pull
                 * requests anyway.
                 */
                !pullRequest.isChained,
        )
        .sort((a, b) => {
            const bTimeOrder: number = isDateAfter({
                fullDate: b.pullRequest.dates.lastUpdated,
                relativeTo: a.pullRequest.dates.lastUpdated,
            })
                ? 1
                : isDateAfter({
                        fullDate: a.pullRequest.dates.lastUpdated,
                        relativeTo: b.pullRequest.dates.lastUpdated,
                    })
                  ? -1
                  : 0;

            const aSort: number = getPullRequestSortNumber(a) + bTimeOrder;
            const bSort: number = getPullRequestSortNumber(b);

            return bSort - aSort;
        });
}

function getPullRequestSortNumber(pullRequest: Readonly<ChainedPullRequest>): number {
    const isDraft = pullRequest.pullRequest.status.mergeStatus === PullRequestMergeStatus.Draft;
    const needsReview = !pullRequest.pullRequest.currentUser.hasReviewed;

    const isPrimaryReviewer = needsReview && pullRequest.pullRequest.currentUser.isPrimaryReviewer;
    const isCodeOwner = needsReview && pullRequest.pullRequest.currentUser.isCodeOwner;

    const draft = isDraft ? 0 : 10_000;
    const review = needsReview ? 1000 : 0;
    const primary = isPrimaryReviewer ? 100 : 0;
    const codeOwner = isCodeOwner ? 10 : 0;

    return draft + primary + codeOwner + review;
}
