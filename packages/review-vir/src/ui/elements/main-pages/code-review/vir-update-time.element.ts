import {type FullDate, getNowInUserTimezone, toFormattedString, toRelativeString} from 'date-vir';
import {defineElement, html, nothing} from 'element-vir';

export const VirUpdateTime = defineElement<{updateTime: Readonly<FullDate> | undefined}>()({
    tagName: 'vir-update-time',
    state() {
        return {
            now: getNowInUserTimezone(),
            intervalId: undefined as undefined | ReturnType<typeof globalThis.setInterval>,
            refreshNow: undefined as undefined | (() => void),
        };
    },
    init({updateState, state}) {
        const refreshNow = () => {
            updateState({
                now: getNowInUserTimezone(),
            });
        };

        if (!state.intervalId) {
            updateState({
                intervalId: globalThis.setInterval(refreshNow, 3000),
            });
        }

        /**
         * Timers get throttled or suspended while the tab is hidden, so the relative time can be
         * arbitrarily stale when the user comes back. Refresh immediately whenever the page becomes
         * visible or regains focus.
         */
        globalThis.document.addEventListener('visibilitychange', refreshNow);
        globalThis.addEventListener('focus', refreshNow);

        updateState({refreshNow});
    },
    cleanup({updateState, state}) {
        globalThis.clearInterval(state.intervalId);
        if (state.refreshNow) {
            globalThis.document.removeEventListener('visibilitychange', state.refreshNow);
            globalThis.removeEventListener('focus', state.refreshNow);
        }
        updateState({
            intervalId: undefined,
            refreshNow: undefined,
        });
    },
    render({inputs, state}) {
        if (!inputs.updateTime) {
            return nothing;
        }

        const relativeString = toRelativeString(
            {
                start: state.now,
                end: inputs.updateTime,
            },
            {
                years: true,
                months: true,
                days: true,

                hours: true,
                minutes: true,
                seconds: true,
            },
            {
                decimalCount: 0,
                useOnlyLargestUnit: true,
                justNowThresholds: {
                    seconds: 1,
                },
            },
        );

        const exactTimestamp = toFormattedString(inputs.updateTime, 'MMMM d, yyyy, h:mm:ss a ZZZZ');

        return html`
            <span title=${exactTimestamp}>${relativeString}</span>
        `;
    },
});
