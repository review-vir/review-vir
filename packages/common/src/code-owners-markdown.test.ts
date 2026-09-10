import {describe, itCases} from '@augment-vir/test';
import {createCodeOwnersMarkdownBlock} from './code-owners-markdown.js';

describe(createCodeOwnersMarkdownBlock.name, () => {
    itCases(createCodeOwnersMarkdownBlock, [
        {
            it: 'wraps content in a code owners heading and comment markers',
            input: '@owner\n<details>\n<summary>Owned files</summary>\n</details>',
            expect: [
                '<!-- code owners start -->',
                '## Code Owners',
                '@owner',
                '<details>',
                '<summary>Owned files</summary>',
                '</details>',
                '<!-- code owners end -->',
            ].join('\n'),
        },
    ]);
});
