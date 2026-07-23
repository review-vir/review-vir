import {defineGitAdapter, type FetchGitDataResult, type GitUser} from '@review-vir/adapter-core';
import {getNowInUserTimezone} from 'date-vir';
import {fetchGithubPullRequests} from './github-query/fetch-github.js';
import {parseGithubPullRequest, parseGithubUser} from './parse-github-data.js';

const serviceName = 'GitHub';

export const GithubAdapter = defineGitAdapter({
    serviceName,
    async fetchGitData(authToken) {
        const githubData = await fetchGithubPullRequests(authToken);

        const user: Readonly<GitUser> = parseGithubUser(githubData.viewer);

        const pullRequests = githubData.search.nodes.map((rawPullRequest) =>
            parseGithubPullRequest({
                authTokenName: authToken.authTokenName,
                raw: rawPullRequest,
                currentUser: user,
                serviceName,
            }),
        );

        const finalizedData: FetchGitDataResult = {
            data: [
                {
                    pullRequests,
                    time: getNowInUserTimezone(),
                },
            ],
            queryCost: githubData.rateLimit.cost,
        };

        console.info('Fetched GitHub data:', finalizedData);

        return finalizedData;
    },
});
