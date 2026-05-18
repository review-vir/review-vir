import {removePrefix, safeMatch} from '@augment-vir/common';

/**
 * Accepts a pull request text body, expected to be in plain text format (not markdown) and parses
 * out tagged primary reviewers from strings that look like:
 *
 * `primary reviewer: @username, @otherUsername`
 *
 * Which will return the following output:
 *
 * `['username', 'otherUsername']`
 */
export function parseDescriptionUsers({
    triggerText,
    bodyText,
}: {
    /**
     * The start of the line for which usernames need to be parsed out of. An `'s'` is automatically
     * allowed at the end of this text. Case insensitive.
     *
     * @example
     *
     * - `'primary reviewer'`
     * - `'code owner'`
     */
    triggerText: string;
    bodyText: string;
}): string[] {
    const [
        ,
        match,
    ] = safeMatch(bodyText, new RegExp(`${triggerText}s?\\W+((?:@[^@]+)+)(?:\n\n|$|\n#)`, 'i'));

    if (!match) {
        return [];
    }

    const [
        ,
        restrictedMatch,
    ] = safeMatch(match, /((?:@[\w-]+[^\w@]*)+)/);

    const userTags = Array.from(restrictedMatch?.matchAll(/@[\w-]+/g) || []);

    return userTags.map((userTag) =>
        removePrefix({
            value: userTag[0],
            prefix: '@',
        }),
    );
}
