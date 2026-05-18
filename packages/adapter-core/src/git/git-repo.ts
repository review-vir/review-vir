import {defineShape} from 'object-shape-tester';
import {gitUserShape} from './git-user.js';

export const gitRepoShape = defineShape({
    repoName: '',
    repoOwner: gitUserShape,
    htmlUrl: '',
    isPrivate: false,
    isArchived: false,
});

export type GitRepo = typeof gitRepoShape.runtimeType;
