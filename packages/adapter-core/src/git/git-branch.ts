import {defineShape} from 'object-shape-tester';
import {gitRepoShape} from './git-repo.js';

export const gitBranchShape = defineShape({
    repo: gitRepoShape,
    branchName: '',
});

export type GitBranch = typeof gitBranchShape.runtimeType;
