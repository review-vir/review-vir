import {colorCss} from '@electrovir/color';
import {getNowInUserTimezone, isDateAfter, toLocaleString, type FullDate} from 'date-vir';
import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {ViraButton, ViraColorVariant, viraTheme} from 'vira';

export const VirPausedBanner = defineElement<{
    serviceName: string;
    message: string;
    resetAt: FullDate | undefined;
}>()({
    tagName: 'vir-paused-banner',
    styles: css`
        :host {
            ${colorCss(viraTheme.colors['vira-red-on-self-body'])};
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px 12px;
            border: 1px solid ${viraTheme.colors['vira-red-on-self-body'].foreground.value};
            border-radius: 8px;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
        }
    `,
    events: {
        resume: defineElementEvent<void>(),
    },
    state() {
        return {
            now: getNowInUserTimezone(),
            tickIntervalId: undefined as ReturnType<typeof globalThis.setInterval> | undefined,
        };
    },
    init({updateState}) {
        const tickIntervalId = globalThis.setInterval(() => {
            updateState({
                now: getNowInUserTimezone(),
            });
        }, 5000);
        updateState({
            tickIntervalId,
        });
    },
    cleanup({state}) {
        globalThis.clearInterval(state.tickIntervalId);
    },
    render({inputs, state, dispatch, events}) {
        const canResume =
            !inputs.resetAt ||
            isDateAfter({
                fullDate: state.now,
                relativeTo: inputs.resetAt,
            });
        const resetSuffix = inputs.resetAt
            ? ` Resets at ${toLocaleString(inputs.resetAt, {
                  dateStyle: 'short',
                  timeStyle: 'short',
              })}.`
            : '';

        return html`
            <div class="header">Auto-updates paused for ${inputs.serviceName}</div>
            <div>${inputs.message}${resetSuffix}</div>
            <div>
                <${ViraButton.assign({
                    text: 'Resume now',
                    isDisabled: !canResume,
                    color: ViraColorVariant.Positive,
                })}
                    ${listen('click', () => {
                        dispatch(new events.resume());
                    })}
                ></${ViraButton}>
            </div>
        `;
    },
});
