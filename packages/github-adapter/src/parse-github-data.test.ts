import {assert, assertWrap} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {PullRequestDisplayStatus} from '@review-vir/adapter-core';
import {assertValidShape} from 'object-shape-tester';
import {mockGithubSearch} from './github-query/github-response.mock.js';
import {
    GithubGraphqlCheckRunConclusion,
    GithubMergeStateStatus,
    githubPullRequestShape,
    GithubReviewDecision,
    type GithubPullRequest,
} from './github-query/graphql-query.js';
import {parseGithubPullRequest} from './parse-github-data.js';

function parseWithFailedCheck({
    mergeStateStatus,
    reviewDecision,
}: Readonly<Pick<GithubPullRequest, 'mergeStateStatus' | 'reviewDecision'>>) {
    const mockPullRequest = assertWrap.isDefined(mockGithubSearch.search.nodes[0]);
    assertValidShape(mockPullRequest, githubPullRequestShape);

    const rawPullRequest = {
        ...mockPullRequest,
        mergeStateStatus,
        reviewDecision,
        reviewThreads: {
            nodes: [],
        },
        commits: {
            ...mockPullRequest.commits,
            nodes: [
                {
                    commit: {
                        statusCheckRollup: {
                            contexts: {
                                checkRunCountsByState: [
                                    {
                                        count: 1,
                                        state: GithubGraphqlCheckRunConclusion.Cancelled,
                                    },
                                    {
                                        count: 1,
                                        state: GithubGraphqlCheckRunConclusion.Failure,
                                    },
                                    {
                                        count: 3,
                                        state: GithubGraphqlCheckRunConclusion.Success,
                                    },
                                ],
                            },
                        },
                    },
                },
            ],
        },
    };
    assertValidShape(rawPullRequest, githubPullRequestShape);

    const pullRequest = parseGithubPullRequest({
        authTokenName: 'test auth token',
        currentUser: {
            avatarUrl: '',
            profileUrl: '',
            username: 'test user',
        },
        raw: rawPullRequest,
        serviceName: 'GitHub',
    });

    return {
        failCount: pullRequest.status.checksStatus?.failCount,
        displayStatus: pullRequest.status.displayStatus,
    };
}

describe(parseGithubPullRequest.name, () => {
    it('does not count cancelled check runs as failures', () => {
        assert.deepEquals(
            parseWithFailedCheck({
                reviewDecision: null,
            }),
            {
                failCount: 1,
                displayStatus: PullRequestDisplayStatus.BuildFailureFinished,
            },
        );
    });
    it('ignores failures when required checks are passing', () => {
        assert.deepEquals(
            parseWithFailedCheck({
                mergeStateStatus: GithubMergeStateStatus.Clean,
                reviewDecision: GithubReviewDecision.Approved,
            }),
            {
                failCount: 0,
                displayStatus: PullRequestDisplayStatus.ReadyToMerge,
            },
        );
    });
    it('shows reviews instead of failures when blocked on reviews', () => {
        assert.deepEquals(
            parseWithFailedCheck({
                mergeStateStatus: GithubMergeStateStatus.Blocked,
                reviewDecision: GithubReviewDecision.ReviewRequired,
            }),
            {
                failCount: 0,
                displayStatus: PullRequestDisplayStatus.Waiting,
            },
        );
    });
    it('keeps failures when blocked with reviews done', () => {
        assert.deepEquals(
            parseWithFailedCheck({
                mergeStateStatus: GithubMergeStateStatus.Blocked,
                reviewDecision: GithubReviewDecision.Approved,
            }),
            {
                failCount: 1,
                displayStatus: PullRequestDisplayStatus.BuildFailureFinished,
            },
        );
    });
});
