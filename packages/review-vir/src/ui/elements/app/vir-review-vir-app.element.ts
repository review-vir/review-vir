import {check} from '@augment-vir/assert';
import {extractErrorMessage} from '@augment-vir/common';
import {getGitAdapterGlobalVars} from '@review-vir/adapter-core';
import {asyncProp, classMap, css, defineElement, html, listen, nothing} from 'element-vir';
import {countAuthTokens, loadAllAdapterAuthTokens} from '../../../data/auth-tokens.js';
import {
    type ReviewVirFullRoute,
    ReviewVirMainPath,
    createReviewVirRouter,
    defaultReviewVirFullRoute,
} from '../../../data/routing.js';
import {type AppSettings, loadSettings} from '../../../data/settings.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {VirErrorMessage} from '../common-elements/vir-error-message.element.js';
import {VirAnnualReview} from '../main-pages/annual-review/vir-annual-review.element.js';
import {VirCodeReview} from '../main-pages/code-review/vir-code-review.element.js';
import {VirAuthTokenEntry} from '../main-pages/settings/auth-token-entry/vir-auth-token-entry.element.js';
import {VirSettings} from '../main-pages/settings/vir-settings.element.js';

export const VirReviewVirApp = defineElement()({
    tagName: 'vir-review-vir-app',
    styles: css`
        :host {
            padding: 8px 16px;
            display: block;
        }

        :host,
        .root {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            min-height: 100%;
            width: 100%;
            box-sizing: border-box;
            font-family: sans-serif;
            gap: 16px;
        }

        .root > * {
            flex-grow: 1;
        }

        .hide-main-page {
            display: none;
        }

        ${VirErrorMessage} {
            margin: 16px;
        }
        .hidden {
            display: none;
        }
    `,
    state() {
        return {
            appSettings: asyncProp({
                async updateCallback({
                    secretEncryptionKey,
                }: {
                    secretEncryptionKey: string | undefined;
                }): Promise<AppSettings> {
                    if (!secretEncryptionKey) {
                        throw new Error('No encryption key found. Cannot run review-vir.');
                    }

                    return {
                        ...(await loadSettings()),
                        authTokens: await loadAllAdapterAuthTokens(secretEncryptionKey),
                    };
                },
            }),
            router: createReviewVirRouter(),
            currentRoute: undefined as Readonly<ReviewVirFullRoute> | undefined,
        };
    },
    init({state, updateState}) {
        state.router.listen(true, (route) => {
            updateState({
                currentRoute: route,
            });
        });
    },
    render({state}) {
        const secretEncryptionKey = getGitAdapterGlobalVars().encryptionKey || '';

        state.appSettings.update({
            secretEncryptionKey,
        });

        if (state.appSettings.isError()) {
            return html`
                <${VirErrorMessage}>
                    ${extractErrorMessage(state.appSettings.value)}
                </${VirErrorMessage}>
            `;
        }

        const currentRoute: Readonly<ReviewVirFullRoute> =
            (state.appSettings.isResolved() &&
            countAuthTokens(state.appSettings.value.authTokens) === 0
                ? {
                      ...defaultReviewVirFullRoute,
                      paths: [ReviewVirMainPath.Settings],
                  }
                : state.currentRoute) || defaultReviewVirFullRoute;

        if (!state.currentRoute || !check.jsonEquals(currentRoute, state.currentRoute)) {
            state.router.setRoute(currentRoute);
        }

        const codeReviewTemplate = html`
            <${VirCodeReview.assign({
                router: state.router,
                secretEncryptionKey,
                currentRoute,
            })}
                class=${classMap({
                    hidden: currentRoute.paths[0] !== ReviewVirMainPath.CodeReview,
                })}
            ></${VirCodeReview}>
        `;

        const routedElementTemplate =
            currentRoute.paths[0] === ReviewVirMainPath.Settings
                ? html`
                      <${VirSettings.assign({
                          secretEncryptionKey,
                          currentAppSettings: state.appSettings,
                      })}></${VirSettings}>
                  `
                : currentRoute.paths[0] === ReviewVirMainPath.AnnualReview
                  ? html`
                        <${VirAnnualReview.assign({
                            currentAppSettings: state.appSettings,
                            router: state.router,
                        })}></${VirAnnualReview}>
                    `
                  : nothing;

        return html`
            <div
                class="root"
                ${listen(ChangeRouteEvent, (event) => {
                    state.router.setRoute(event.detail);
                })}
                ${listen(VirAuthTokenEntry.events.authTokensChange, (event) => {
                    if (!state.appSettings.isResolved()) {
                        return;
                    }

                    state.appSettings.setValue({
                        ...state.appSettings.value,
                        authTokens: event.detail,
                    });
                })}
            >
                ${codeReviewTemplate} ${routedElementTemplate}
            </div>
        `;
    },
});
