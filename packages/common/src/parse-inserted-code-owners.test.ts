import {describe, itCases} from '@augment-vir/test';
import {createCodeOwnersMarkdownBlock} from './code-owners-markdown.js';
import {
    parseInsertedCodeOwnerFiles,
    parseInsertedCodeOwners,
} from './parse-inserted-code-owners.js';

describe(parseInsertedCodeOwners.name, () => {
    itCases(parseInsertedCodeOwners, [
        {
            it: 'parses multiple owners from the inserted details format',
            input: '<!-- code owners start -->\n## Code Owners\n@my-name1\n<details>\n<summary>Owned files</summary>\n\n- [packages/a/index.ts](https://github.com/o/r/pull/1/files#diff-abc)\n\n</details>\n@my-name2\n<details>\n<summary>Owned files</summary>\n\n- [packages/b/index.ts](https://github.com/o/r/pull/1/files#diff-def)\n\n</details>\n<!-- code owners end -->',
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
            input: '<!-- code owners start -->\n## Code Owners\n@my-name1\n<details>\n<summary>Owned files</summary>\n\n- [node_modules/@types/node/index.ts](https://github.com/o/r/pull/1/files#diff-abc)\n\n</details>\n<!-- code owners end -->',
            expect: [
                'my-name1',
            ],
        },
        {
            it: 'dedupes a repeated owner',
            input: '<!-- code owners start -->\n## Code Owners\n@my-name1\n@my-name1\n<!-- code owners end -->',
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

describe(parseInsertedCodeOwnerFiles.name, () => {
    itCases(parseInsertedCodeOwnerFiles, [
        {
            it: 'maps each owner to their files',
            input: [
                '<!-- code owners start -->',
                '## Code Owners',
                '<details>',
                '<summary>@my-name1 Owned files</summary>',
                '',
                '- [packages/a/index.ts](https://github.com/o/r/pull/1/files#diff-abc)',
                '- [packages/a/other.ts](https://github.com/o/r/pull/1/files#diff-abd)',
                '',
                '</details>',
                '<details>',
                '<summary>@my-name2 Owned files</summary>',
                '',
                '- [packages/b/index.ts](https://github.com/o/r/pull/1/files#diff-def)',
                '',
                '</details>',
                '<!-- code owners end -->',
            ].join('\n'),
            expect: {
                'my-name1': [
                    'packages/a/index.ts',
                    'packages/a/other.ts',
                ],
                'my-name2': [
                    'packages/b/index.ts',
                ],
            },
        },
        {
            it: 'parses a block built by createCodeOwnersMarkdownBlock',
            input: createCodeOwnersMarkdownBlock(
                [
                    '<details>',
                    '<summary>@my-name1 Owned files</summary>',
                    '',
                    '- [packages/a/index.ts](https://github.com/o/r/pull/1/files#diff-abc)',
                    String.raw`- [src/\[id\]/a\\b.ts](https://github.com/o/r/pull/1/files#diff-abd)`,
                    '',
                    '</details>',
                    '<details>',
                    '<summary>@my-name2 Owned files</summary>',
                    '',
                    '- [packages/b/index.ts](https://github.com/o/r/pull/1/files#diff-def)',
                    '',
                    '</details>',
                ].join('\n'),
            ),
            expect: {
                'my-name1': [
                    'packages/a/index.ts',
                    String.raw`src/[id]/a\b.ts`,
                ],
                'my-name2': [
                    'packages/b/index.ts',
                ],
            },
        },
        {
            it: 'unescapes link text',
            input: [
                '<!-- code owners start -->',
                '## Code Owners',
                '<details>',
                '<summary>@my-name1 Owned files</summary>',
                '',
                String.raw`- [src/\[id\]/a\\b.ts](https://github.com/o/r/pull/1/files#diff-abc)`,
                '',
                '</details>',
                '<!-- code owners end -->',
            ].join('\n'),
            expect: {
                'my-name1': [
                    String.raw`src/[id]/a\b.ts`,
                ],
            },
        },
        {
            it: 'parses the older owner-above-summary layout',
            input: '<!-- code owners start -->\n## Code Owners\n@my-name1\n<details>\n<summary>Owned files</summary>\n\n- [node_modules/@types/node/index.ts](https://github.com/o/r/pull/1/files#diff-abc)\n\n</details>\n<!-- code owners end -->',
            expect: {
                'my-name1': [
                    'node_modules/@types/node/index.ts',
                ],
            },
        },
        {
            it: 'has no entries for the legacy inline format',
            input: '<!-- code owners start -->\n**Code owners**: @my-name1\n<details>\n<summary>Owned files</summary>\n\n- old/path.ts\n\n</details>\n<!-- code owners end -->',
            expect: {},
        },
        {
            it: 'returns undefined when there is no inserted block',
            input: 'Primary reviewer: @my-name1\nChanges\n\nstuff',
            expect: undefined,
        },
    ]);
});
