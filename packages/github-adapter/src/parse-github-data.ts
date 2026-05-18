import {check} from '@augment-vir/assert';
import {arrayToObject, typedObjectFromEntries} from '@augment-vir/common';
import {
    PullRequestDisplayStatus,
    PullRequestMergeStatus,
    PullRequestReviewStatus,
    type GitUser,
    type PullRequest,
    type PullRequestChecks,
    type PullRequestReview,
} from '@review-vir/adapter-core';
import {parseDescriptionUsers} from '@review-vir/common';
import {createFullDateInUserTimezone, getNowInUserTimezone} from 'date-vir';
import type {OmitDeep} from 'type-fest';
import {
    failedCheckRunConclusions,
    GithubGraphqlReviewState,
    GithubMergeableState,
    pendingCheckRunConclusions,
    successCheckRunConclusions,
    type GithubPullRequest,
    type GithubRunCheckState,
    type GithubUserSearchResponse,
} from './github-query/graphql-query.js';

export function parseGithubPullRequest(
    authTokenName: string,
    raw: Readonly<GithubPullRequest>,
    currentUser: Readonly<GitUser>,
    serviceName: string,
): PullRequest {
    const dates = {
        closed: raw.closedAt ? createFullDateInUserTimezone(raw.closedAt) : undefined,
        created: createFullDateInUserTimezone(raw.createdAt),
        lastUpdated: createFullDateInUserTimezone(raw.updatedAt),
    };

    const assignees = raw.assignees.nodes.map(parseGithubUser);
    const authors = [parseGithubUser(raw.author)];

    const primaryReviewers = parseDescriptionUsers({
        bodyText: raw.bodyText,
        triggerText: 'primary reviewer',
    });
    const codeOwners = parseDescriptionUsers({
        bodyText: raw.bodyText,
        triggerText: 'code owner',
    });
    const pullRequestUsers: PullRequest['users'] = {
        assignees: groupUsersByUserName(assignees.length ? assignees : authors),
        reviewers: parseReviews(
            {
                codeOwners,
                primaryReviewers,
            },
            raw,
        ),
    };

    const mergeStatus: PullRequestMergeStatus = raw.mergedAt
        ? PullRequestMergeStatus.Merged
        : raw.closedAt
          ? PullRequestMergeStatus.Rejected
          : raw.isDraft
            ? PullRequestMergeStatus.Draft
            : PullRequestMergeStatus.Open;

    const pullRequest = {
        authTokenName,
        branches: {
            headBranch: {
                branchName: raw.headRef.name,
                repo: {
                    isArchived: raw.headRepository.isArchived,
                    isPrivate: raw.headRepository.isPrivate,
                    htmlUrl: raw.headRepository.url,
                    repoName: raw.headRepository.name,
                    repoOwner: parseGithubUser(raw.headRepository.owner),
                },
            },
            targetBranch: {
                branchName: raw.baseRef.name,
                repo: {
                    isArchived: raw.baseRepository.isArchived,
                    isPrivate: raw.baseRepository.isPrivate,
                    htmlUrl: raw.baseRepository.url,
                    repoName: raw.baseRepository.name,
                    repoOwner: parseGithubUser(raw.baseRepository.owner),
                },
            },
        },
        changes: {
            additions: raw.additions,
            deletions: raw.deletions,
            changedFiles: raw.changedFiles,
        },
        dates,
        id: {
            htmlUrl: raw.url,
            prId: raw.id,
            prNumber: String(raw.number),
            title: raw.title,
            owner: parseGithubUser(raw.baseRepository.owner),
            gitServiceName: serviceName,
        },
        status: {
            checksStatus: parseStates(
                raw.commits.nodes[0]?.commit.statusCheckRollup?.contexts.checkRunCountsByState,
            ),
            comments: parseComments(raw.reviewThreads.nodes),
            commitCount: raw.commits.totalCount,
            mergeStatus,
            mergedBy: raw.mergedBy ? parseGithubUser(raw.mergedBy) : undefined,
            hasMergeConflicts: raw.mergeable === GithubMergeableState.Conflicting,
            pullRequestLabels: raw.labels
                ? raw.labels.nodes.map((node) => {
                      return {
                          ...node,
                          color: `#${node.color}`,
                      };
                  })
                : [],
        },
        users: pullRequestUsers,
        currentUser: {
            hasReviewed: !determineIfNeedsReviewFromCurrentUser(
                mergeStatus,
                currentUser,
                pullRequestUsers,
            ),
            isAssignee: currentUser.username in pullRequestUsers.assignees,
            isCodeOwner: codeOwners.includes(currentUser.username),
            isPrimaryReviewer: primaryReviewers.includes(currentUser.username),
        },
        raw,
        fetchDate: getNowInUserTimezone(),
    };

    return {
        ...pullRequest,
        status: {
            ...pullRequest.status,
            displayStatus: determineDisplayStatus(pullRequest),
        },
    };
}

function parseComments(
    commentNodes: GithubPullRequest['reviewThreads']['nodes'],
): PullRequest['status']['comments'] {
    return commentNodes.reduce(
        (accum, current) => {
            if (current.isResolved) {
                accum.resolved++;
            }
            accum.total++;
            return accum;
        },
        {
            resolved: 0,
            total: 0,
        },
    );
}

function determineIfNeedsReviewFromCurrentUser(
    mergeStatus: PullRequestMergeStatus,
    user: Readonly<Pick<GitUser, 'username'>>,
    pullRequestUsers: Readonly<Pick<PullRequest['users'], 'reviewers' | 'assignees'>>,
): boolean {
    return (
        mergeStatus === PullRequestMergeStatus.Open &&
        pullRequestUsers.reviewers[user.username]?.reviewStatus ===
            PullRequestReviewStatus.Pending &&
        !(user.username in pullRequestUsers.assignees)
    );
}

function parseReviews(
    {
        codeOwners,
        primaryReviewers,
    }: {
        primaryReviewers: ReadonlyArray<string>;
        codeOwners: ReadonlyArray<string>;
    },
    raw: Readonly<Pick<GithubPullRequest, 'latestOpinionatedReviews' | 'reviewRequests'>>,
): PullRequest['users']['reviewers'] {
    const pendingReviewers = groupUsersByUserName(
        raw.reviewRequests.nodes.map((node) => parseGithubUser(node.requestedReviewer)),
    );

    const latestOpinionatedReviews = arrayToObject(raw.latestOpinionatedReviews.nodes, (review) => {
        return {
            key: review.author.login,
            value: review,
        };
    });

    const allUsernames = Array.from(
        new Set([
            ...Object.keys(pendingReviewers),
            ...Object.keys(latestOpinionatedReviews),
        ]),
    );

    return typedObjectFromEntries(
        allUsernames.map(
            (
                username,
            ): [
                string,
                PullRequestReview,
            ] => {
                const user =
                    pendingReviewers[username] || latestOpinionatedReviews[username]?.author;

                if (!user) {
                    throw new Error(`Failed to find user '${username}'`);
                }

                const reviewStatus: PullRequestReviewStatus = check.hasKey(
                    pendingReviewers,
                    username,
                )
                    ? PullRequestReviewStatus.Pending
                    : latestOpinionatedReviews[username]?.state ===
                        GithubGraphqlReviewState.Approved
                      ? PullRequestReviewStatus.Accepted
                      : latestOpinionatedReviews[username]?.state ===
                          GithubGraphqlReviewState.ChangesRequested
                        ? PullRequestReviewStatus.Rejected
                        : PullRequestReviewStatus.Pending;

                return [
                    username,
                    {
                        user: {
                            avatarUrl: user.avatarUrl || '',
                            profileUrl: user.avatarUrl || '',
                            username,
                        },
                        isPrimaryReviewer: primaryReviewers.includes(username),
                        isCodeOwner: codeOwners.includes(username),
                        reviewStatus,
                    },
                ];
            },
        ),
    );
}

function parseStates(
    /** Sometimes this is undefined even if nothing is wrong. */
    checkStates: ReadonlyArray<Readonly<GithubRunCheckState>> | undefined,
): PullRequestChecks | undefined {
    if (!checkStates) {
        return undefined;
    }

    const results = checkStates.reduce(
        (accum, checkState) => {
            if (check.hasValue(failedCheckRunConclusions, checkState.state)) {
                accum.failCount += checkState.count;
            } else if (check.hasValue(pendingCheckRunConclusions, checkState.state)) {
                accum.inProgressCount += checkState.count;
            } else if (check.hasValue(successCheckRunConclusions, checkState.state)) {
                accum.successCount += checkState.count;
            }
            accum.totalCount++;
            return accum;
        },
        {
            successCount: 0,
            failCount: 0,
            inProgressCount: 0,
            totalCount: 0,
        },
    );

    return results;
}

function determineDisplayStatus(
    pullRequest: OmitDeep<PullRequest, 'status.displayStatus'>,
): PullRequestDisplayStatus {
    if (pullRequest.status.mergeStatus === PullRequestMergeStatus.Draft) {
        return PullRequestDisplayStatus.Draft;
    } else if (pullRequest.currentUser.isPrimaryReviewer) {
        return PullRequestDisplayStatus.PrimaryReviewer;
    } else if (pullRequest.currentUser.isCodeOwner) {
        return PullRequestDisplayStatus.CodeOwner;
    } else if (pullRequest.status.hasMergeConflicts) {
        return PullRequestDisplayStatus.MergeConflicts;
    } else if (
        pullRequest.status.checksStatus?.failCount &&
        pullRequest.status.checksStatus.inProgressCount
    ) {
        return PullRequestDisplayStatus.BuildFailureInProgress;
    } else if (pullRequest.status.checksStatus?.failCount) {
        return PullRequestDisplayStatus.BuildFailureFinished;
    } else if (pullRequest.status.comments.resolved < pullRequest.status.comments.total) {
        return PullRequestDisplayStatus.UnresolvedComments;
    } else if (
        !pullRequest.status.checksStatus ||
        pullRequest.status.checksStatus.successCount < pullRequest.status.checksStatus.totalCount ||
        pullRequest.status.checksStatus.inProgressCount ||
        Object.values(pullRequest.users.reviewers).some((user) => {
            if (user.isCodeOwner || user.isPrimaryReviewer) {
                /** Only wait for accepted reviews for code owners and primary reviewers. */
                return user.reviewStatus !== PullRequestReviewStatus.Accepted;
            } else {
                /** Any rejected review blocks merging. */
                return user.reviewStatus === PullRequestReviewStatus.Rejected;
            }
        })
    ) {
        return PullRequestDisplayStatus.Waiting;
    } else {
        return PullRequestDisplayStatus.ReadyToMerge;
    }
}

export function parseGithubUser(raw: GithubUserSearchResponse): GitUser {
    return {
        avatarUrl: raw.teamAvatarUrl || raw.avatarUrl || '',
        profileUrl: raw.url,
        username: raw.login,
    };
}

function groupUsersByUserName(users: ReadonlyArray<Readonly<GitUser>>) {
    return arrayToObject(users, (user) => {
        return {
            key: user.username,
            value: user,
        };
    }) as Record<string, GitUser>;
}
