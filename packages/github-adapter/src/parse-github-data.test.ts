import {assert, assertWrap} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {mockGithubSearch} from './github-query/github-response.mock.js';
import {
    GithubGraphqlCheckRunConclusion,
    githubPullRequestShape,
    type GithubCheckRun,
} from './github-query/graphql-query.js';
import {parseGithubPullRequest} from './parse-github-data.js';

function createCheckRun({
    name,
    databaseId,
    conclusion,
}: Readonly<Pick<GithubCheckRun, 'name' | 'databaseId' | 'conclusion'>>): GithubCheckRun {
    return {
        __typename: 'CheckRun',
        name,
        databaseId,
        conclusion,
        status: conclusion
            ? GithubGraphqlCheckRunConclusion.Completed
            : GithubGraphqlCheckRunConclusion.InProgress,
        checkSuite: {
            workflowRun: {
                workflow: {
                    name: 'PR Checks',
                },
            },
        },
    };
}

function parseChecks(checkRuns: ReadonlyArray<Readonly<GithubCheckRun>>) {
    const mockPullRequest = assertWrap.isDefined(mockGithubSearch.search.nodes[0]);
    assertValidShape(mockPullRequest, githubPullRequestShape);

    const rawPullRequest = {
        ...mockPullRequest,
        commits: {
            ...mockPullRequest.commits,
            nodes: [
                {
                    commit: {
                        statusCheckRollup: {
                            contexts: {
                                nodes: [
                                    ...checkRuns,
                                    {
                                        __typename: 'StatusContext',
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

    return parseGithubPullRequest({
        authTokenName: 'test auth token',
        currentUser: {
            avatarUrl: '',
            profileUrl: '',
            username: 'test user',
        },
        raw: rawPullRequest,
        serviceName: 'GitHub',
    }).status.checksStatus;
}

describe(parseGithubPullRequest.name, () => {
    it('does not count cancelled check runs as failures', () => {
        assert.deepEquals(
            parseChecks([
                createCheckRun({
                    name: 'a',
                    databaseId: 1,
                    conclusion: GithubGraphqlCheckRunConclusion.Cancelled,
                }),
                createCheckRun({
                    name: 'b',
                    databaseId: 2,
                    conclusion: GithubGraphqlCheckRunConclusion.Failure,
                }),
            ]),
            {
                successCount: 0,
                failCount: 1,
                inProgressCount: 0,
                totalCount: 2,
            },
        );
    });
    it('only counts the latest run of each check', () => {
        assert.deepEquals(
            parseChecks([
                createCheckRun({
                    name: 'Check PR',
                    databaseId: 3,
                    conclusion: GithubGraphqlCheckRunConclusion.Success,
                }),
                createCheckRun({
                    name: 'Check PR',
                    databaseId: 1,
                    conclusion: GithubGraphqlCheckRunConclusion.Failure,
                }),
                createCheckRun({
                    name: 'Check PR',
                    databaseId: 2,
                    conclusion: GithubGraphqlCheckRunConclusion.Failure,
                }),
                createCheckRun({
                    name: 'lint',
                    databaseId: 4,
                    conclusion: null,
                }),
            ]),
            {
                successCount: 1,
                failCount: 0,
                inProgressCount: 1,
                totalCount: 2,
            },
        );
    });
});
