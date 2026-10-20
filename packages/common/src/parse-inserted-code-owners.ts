import {removeDuplicates, removePrefix, safeMatch} from '@augment-vir/common';
import {codeOwnersMarkdown} from './code-owners-markdown.js';

const insertedCodeOwnersRegExp = new RegExp(
    String.raw`${codeOwnersMarkdown.blockStart}([\S\s]*?)${codeOwnersMarkdown.blockEnd}`,
    'i',
);
const fileLinkLineRegExp = /^\s*-\s/;
const userTagRegExp = /@[\w-]+/g;

/**
 * Parses the code owners that pull-request-vir inserts into a pull request's _raw markdown_ body.
 *
 * Pull-request-vir wraps its code owners in HTML comment delimiters and lists each owner on its own
 * line followed by a collapsible list of their owned files:
 *
 *     <!-- code owners start -->
 *     ## Code Owners
 *     (at)username1
 *     <details>
 *     <summary>Owned files</summary>
 *
 *     - [some/file.ts](https://...)
 *
 *     </details>
 *     (at)username2
 *     ...
 *     <!-- code owners end -->
 *
 * Returns the owner usernames (e.g. `['username1', 'username2']`), or `undefined` when the body
 * contains no inserted code owners block (so callers can fall back to other detection).
 *
 * This must run against the raw markdown `body`, not the rendered `bodyText`: GitHub strips HTML
 * comments (and the `<details>` structure) out of `bodyText`, removing the delimiters that bound
 * the block and interleaving the owners with their owned-file text.
 */
export function parseInsertedCodeOwners(body: string): string[] | undefined {
    const [
        ,
        block,
    ] = safeMatch(body, insertedCodeOwnersRegExp);

    if (block == undefined) {
        return undefined;
    }

    /** Drop owned-file link lines so scoped paths (e.g. `@types/...`) aren't read as owners. */
    const ownerLines = block
        .split('\n')
        .filter((line) => !fileLinkLineRegExp.test(line))
        .join('\n');

    const userTags = Array.from(ownerLines.matchAll(userTagRegExp));

    return removeDuplicates(
        userTags.map((userTag) => {
            return removePrefix({
                value: userTag[0],
                prefix: '@',
            });
        }),
    );
}

/**
 * The second alternative is the older layout, which put each owner alone on the line above a plain
 * `<summary>Owned files</summary>`.
 */
const ownerRegExp = /^\s*(?:<summary>@([\w-]+) Owned files<\/summary>|@([\w-]+))\s*$/;
const fileLinkTextRegExp = /^\s*-\s+\[((?:\\.|[^\\\]])*)\]\(/;

/**
 * Same as {@link parseInsertedCodeOwners} but maps each owner username to the file paths listed
 * under them, with pull-request-vir's link text escaping (`\\`, `\[`, `\]`) undone.
 *
 * Usernames keep the case they were written with. The pull request author never has an entry, and
 * neither does anyone in the legacy `**Code owners**: @user` format, since that format doesn't say
 * which files belong to whom. Returns `undefined` when the body has no inserted code owners block.
 *
 * Like {@link parseInsertedCodeOwners}, this must run against the raw markdown `body`.
 *
 * @category Main
 * @example
 *
 * ```ts
 * parseInsertedCodeOwnerFiles(
 *     [
 *         '<!-- code owners start -->',
 *         '## Code Owners',
 *         '<details>',
 *         '<summary>@my-name Owned files</summary>',
 *         '',
 *         '- [src/\\[id\\].ts](https://github.com/o/r/pull/1/files#diff-abc)',
 *         '',
 *         '</details>',
 *         '<!-- code owners end -->',
 *     ].join('\n'),
 * ); // {'my-name': ['src/[id].ts']}
 * ```
 */
export function parseInsertedCodeOwnerFiles(body: string): Record<string, string[]> | undefined {
    const [
        ,
        block,
    ] = safeMatch(body, insertedCodeOwnersRegExp);

    if (block == undefined) {
        return undefined;
    }

    return block.split('\n').reduce<{
        currentOwner: string | undefined;
        filesByOwner: Record<string, string[]>;
    }>(
        (state, line) => {
            const [
                ,
                summaryOwner,
                lineOwner,
            ] = safeMatch(line, ownerRegExp);
            const owner = summaryOwner || lineOwner;

            if (owner) {
                return {
                    currentOwner: owner,
                    filesByOwner: {
                        ...state.filesByOwner,
                        [owner]: state.filesByOwner[owner] || [],
                    },
                };
            }

            const [
                ,
                escapedFilePath,
            ] = safeMatch(line, fileLinkTextRegExp);

            if (escapedFilePath == undefined || !state.currentOwner) {
                return state;
            }

            return {
                currentOwner: state.currentOwner,
                filesByOwner: {
                    ...state.filesByOwner,
                    [state.currentOwner]: [
                        ...(state.filesByOwner[state.currentOwner] || []),
                        escapedFilePath.replaceAll(/\\([\\[\]])/g, '$1'),
                    ],
                },
            };
        },
        {
            currentOwner: undefined,
            filesByOwner: {},
        },
    ).filesByOwner;
}
