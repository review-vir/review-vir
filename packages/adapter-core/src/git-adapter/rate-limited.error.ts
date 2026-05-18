import {type FullDate} from 'date-vir';

/**
 * Thrown by an adapter's fetch function when the upstream service reports a rate limit. The git
 * adapter catches this specifically to stop auto-updates immediately.
 */
export class RateLimitedError extends Error {
    public override readonly name = 'RateLimitedError';
    constructor(
        message: string,
        public readonly resetAt: Readonly<FullDate> | undefined,
    ) {
        super(message);
    }
}
