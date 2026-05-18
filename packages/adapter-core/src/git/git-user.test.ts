import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {gitUserShape} from './git-user.js';
import {mockGitUser} from './git-user.mock.js';

describe('GitUser', () => {
    it('has proper shape', () => {
        assertValidShape(mockGitUser, gitUserShape, {
            allowExtraKeys: true,
        });
    });
});
