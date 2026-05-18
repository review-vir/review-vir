import {extractErrorMessage, log, type AnyObject} from '@augment-vir/common';
import {RateLimitedError, type AuthToken} from '@review-vir/adapter-core';
import {createFullDateInUserTimezone} from 'date-vir';
import {assertValidShape, ShapeMismatchError, type Shape} from 'object-shape-tester';
import type {Primitive} from 'type-fest';
import {githubGraphqlErrorShape} from './graphql-query.js';

function extractRateLimitResetDate(headers: Readonly<Headers>) {
    const rawReset = headers.get('x-ratelimit-reset');
    if (!rawReset) {
        return undefined;
    }
    const resetSeconds = Number(rawReset);
    if (!Number.isFinite(resetSeconds)) {
        return undefined;
    }
    return createFullDateInUserTimezone(resetSeconds * 1000);
}

function isRateLimitError(error: AnyObject) {
    return error.type === 'RATE_LIMIT' || error.code === 'graphql_rate_limit';
}

function isRateLimitHttpResponse(response: Readonly<Response>) {
    return (
        response.status === 429 ||
        (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
    );
}

export async function fetchGithubGraphql<ResponseShape extends Shape>(
    authToken: Readonly<AuthToken>,
    createQuery: (cursor: string | null) => {query: string; variables?: Record<string, Primitive>},
    responseShape: ResponseShape,
    getPageInfo?: (data: ResponseShape['runtimeType']) => {
        endCursor: string | null;
        hasNextPage: boolean;
    },
    /** This is an input so it can be mocked. */
    fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<ResponseShape['runtimeType'][]> {
    try {
        let nextPageCursor: null | string = null;

        const responses: ResponseShape['runtimeType'][] = [];

        do {
            const queryBody = createQuery(nextPageCursor || null);

            const rawResponse = await fetch('https://api.github.com/graphql', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `bearer ${authToken.authTokenSecret}`,
                },
                body: JSON.stringify(queryBody),
            });
            if (!rawResponse.ok) {
                if (isRateLimitHttpResponse(rawResponse)) {
                    throw new RateLimitedError(
                        `GitHub API rate limit exceeded: ${rawResponse.status} ${rawResponse.statusText}`,
                        extractRateLimitResetDate(rawResponse.headers),
                    );
                }
                throw new Error(
                    `GitHub API fetch failed: ${rawResponse.status}, ${rawResponse.statusText}`,
                );
            }
            const responseJson: AnyObject = await rawResponse.json();

            if (responseJson.errors) {
                responseJson.errors.forEach((error: unknown) => {
                    try {
                        assertValidShape(error, githubGraphqlErrorShape, {
                            allowExtraKeys: true,
                        });
                    } catch (shapeError) {
                        if (shapeError instanceof ShapeMismatchError) {
                            log.error(
                                'GitHub GraphQL error did not match expected shape. Raw error:',
                            );
                            log.error(error);
                        }
                        throw shapeError;
                    }
                    log.error(error);
                });
                const rateLimitError = responseJson.errors.find(isRateLimitError);
                if (rateLimitError) {
                    throw new RateLimitedError(
                        rateLimitError.message || 'GitHub API rate limit exceeded.',
                        extractRateLimitResetDate(rawResponse.headers),
                    );
                }
                throw new Error('Failed to fetch GitHub pull requests. See console for details.');
            }

            const data = responseJson.data;

            try {
                assertValidShape(data, responseShape, {
                    allowExtraKeys: true,
                });
            } catch (shapeError) {
                if (shapeError instanceof ShapeMismatchError) {
                    log.error(
                        'GitHub GraphQL response data did not match expected shape. Raw response:',
                    );
                    log.error(responseJson);
                }
                throw shapeError;
            }

            const {endCursor, hasNextPage} = getPageInfo
                ? getPageInfo(data)
                : {
                      endCursor: null,
                      hasNextPage: false,
                  };

            nextPageCursor = hasNextPage ? endCursor : null;
            responses.push(data);
        } while (nextPageCursor);

        return responses;
    } catch (error) {
        log.error(
            `Failed to fetch data for token '${authToken.authTokenName}': ${extractErrorMessage(error)}`,
        );
        throw error;
    }
}
