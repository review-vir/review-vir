/**
 * Defines the Markdown that identifies a code owners block in a pull request description.
 *
 * @category Main
 */
export const codeOwnersMarkdown = Object.freeze({
    blockEnd: '<!-- code owners end -->',
    blockStart: '<!-- code owners start -->',
    heading: '## Code Owners',
});

/**
 * Formats the code owners content that pull-request-vir writes into a pull request description.
 *
 * @category Main
 */
export function createCodeOwnersMarkdownBlock(content: string) {
    return [
        codeOwnersMarkdown.blockStart,
        codeOwnersMarkdown.heading,
        content,
        codeOwnersMarkdown.blockEnd,
    ].join('\n');
}
