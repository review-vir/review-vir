import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {gitRepoShape, type GitRepo} from './git-repo.js';

describe('GitRepo', () => {
    it('has proper types', () => {
        const exampleGitRepo: GitRepo = {
            htmlUrl: 'html',
            isArchived: false,
            isPrivate: false,
            repoName: 'repo name',
            repoOwner: {
                avatarUrl: 'avatar',
                profileUrl: 'profile',
                username: 'user name',
            },
        };

        assertValidShape(exampleGitRepo, gitRepoShape, {
            allowExtraKeys: true,
        });
    });
});
