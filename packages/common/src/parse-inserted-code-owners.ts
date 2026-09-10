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
        userTags.map((userTag) =>
            removePrefix({
                value: userTag[0],
                prefix: '@',
            }),
        ),
    );
}
