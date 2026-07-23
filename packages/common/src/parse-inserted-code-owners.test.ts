import {describe, itCases} from '@augment-vir/test';
import {parseInsertedCodeOwners} from './parse-inserted-code-owners.js';

describe(parseInsertedCodeOwners.name, () => {
    itCases(parseInsertedCodeOwners, [
        {
            it: 'parses multiple owners from the inserted details format',
            input: '<!-- code owners start -->\n**Code owners**:\n@my-name1\n<details>\n<summary>Owned files</summary>\n\n- [packages/a/index.ts](https://github.com/o/r/pull/1/files#diff-abc)\n\n</details>\n@my-name2\n<details>\n<summary>Owned files</summary>\n\n- [packages/b/index.ts](https://github.com/o/r/pull/1/files#diff-def)\n\n</details>\n<!-- code owners end -->',
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'parses the legacy inline format',
            input: '<!-- code owners start -->\n**Code owners**: @my-name1, @my-name2\n<!-- code owners end -->',
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'ignores scoped paths in owned file links',
            input: '<!-- code owners start -->\n**Code owners**:\n@my-name1\n<details>\n<summary>Owned files</summary>\n\n- [node_modules/@types/node/index.ts](https://github.com/o/r/pull/1/files#diff-abc)\n\n</details>\n<!-- code owners end -->',
            expect: [
                'my-name1',
            ],
        },
        {
            it: 'dedupes a repeated owner',
            input: '<!-- code owners start -->\n**Code owners**:\n@my-name1\n@my-name1\n<!-- code owners end -->',
            expect: [
                'my-name1',
            ],
        },
        {
            it: 'returns undefined when there is no inserted block',
            input: 'Primary reviewer: @my-name1\nChanges\n\nstuff',
            expect: undefined,
        },
        {
            it: 'returns an empty array for an empty block',
            input: '<!-- code owners start -->\n<!-- code owners end -->',
            expect: [],
        },
    ]);
});
