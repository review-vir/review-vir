import {type GitRepo} from '@review-vir/adapter-core';
import {parseUrl} from 'url-vir';
import {type AllServiceGitData} from './all-adapters.js';

/** A short display name for a repo, like `owner/repo-name`. */
export function getRepoLabel(repoHtmlUrl: string): string {
    try {
        return parseUrl(repoHtmlUrl).paths.join('/') || repoHtmlUrl;
    } catch {
        return repoHtmlUrl;
    }
}

/** Every repo that any loaded pull request targets, deduplicated by HTML URL. */
export function listKnownRepos(allData: Readonly<AllServiceGitData>): GitRepo[] {
    const reposByUrl = new Map<string, GitRepo>();

    Object.values(allData)
        .flat()
        .flatMap((entry) => entry.pullRequests)
        .forEach((pullRequest) => {
            const repo = pullRequest.branches.targetBranch.repo;
            if (!reposByUrl.has(repo.htmlUrl)) {
                reposByUrl.set(repo.htmlUrl, repo);
            }
        });

    return [...reposByUrl.values()];
}
