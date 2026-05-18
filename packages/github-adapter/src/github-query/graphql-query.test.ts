import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {mockGithubSearch} from './github-response.mock.js';
import {githubSearchShape} from './graphql-query.js';

describe('GithubSearch', () => {
    it('matches a real response', () => {
        assertValidShape(mockGithubSearch, githubSearchShape, {
            allowExtraKeys: true,
        });
    });
});
