import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {pullRequestShape} from './pull-request.js';
import {mockPullRequest} from './pull-request.mock.js';

describe('PullRequest', () => {
    it('matches shape', () => {
        assertValidShape(mockPullRequest, pullRequestShape, {
            allowExtraKeys: true,
        });
    });
});
