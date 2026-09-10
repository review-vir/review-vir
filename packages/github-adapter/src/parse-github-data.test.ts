import {assert, assertWrap} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {mockGithubSearch} from './github-query/github-response.mock.js';
import {
    GithubGraphqlCheckRunConclusion,
    githubPullRequestShape,
} from './github-query/graphql-query.js';
import {parseGithubPullRequest} from './parse-github-data.js';

describe(parseGithubPullRequest.name, () => {
    it('does not count cancelled check runs as failures', () => {
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
                                    checkRunCountsByState: [
                                        {
                                            count: 1,
                                            state: GithubGraphqlCheckRunConclusion.Cancelled,
                                        },
                                        {
                                            count: 1,
                                            state: GithubGraphqlCheckRunConclusion.Failure,
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

        assert.strictEquals(pullRequest.status.checksStatus?.failCount, 1);
    });
});
