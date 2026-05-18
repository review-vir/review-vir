import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {gitBranchShape} from './git-branch.js';
import {mockGitBranch} from './git-branch.mock.js';

describe('GitBranch', () => {
    it('has proper types', () => {
        assertValidShape(mockGitBranch, gitBranchShape, {
            allowExtraKeys: true,
        });
    });
});
