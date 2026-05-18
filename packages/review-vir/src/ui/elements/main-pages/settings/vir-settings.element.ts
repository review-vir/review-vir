import {waitUntil} from '@augment-vir/assert';
import {
    extractErrorMessage,
    getEnumValues,
    getObjectTypedEntries,
    log,
    wait,
} from '@augment-vir/common';
import {
    assertValidAuthToken,
    removeUnusedServiceAuthTokens,
    saveServiceAuthTokens,
} from '@review-vir/adapter-core';
import {
    css,
    defineElement,
    defineElementEvent,
    html,
    ifDefined,
    listen,
    nothing,
    renderAsync,
    type AsyncProp,
} from 'element-vir';
import {LoaderAnimated24Icon, ViraButton, ViraColorVariant, ViraEmphasis, ViraIcon} from 'vira';
import {GitServiceName} from '../../../../data/all-adapters.js';
import {defaultReviewVirFullRoute} from '../../../../data/routing.js';
import type {AppSettings} from '../../../../data/settings.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
import {VirErrorMessage} from '../../common-elements/vir-error-message.element.js';
import {VirAuthTokenEntry} from './auth-token-entry/vir-auth-token-entry.element.js';

export const VirSettings = defineElement<{
    currentAppSettings: AsyncProp<AppSettings, any>;
    secretEncryptionKey: string;
}>()({
    tagName: 'vir-settings',
    events: {
        settingsChange: defineElementEvent<AppSettings>(),
    },
    styles: css`
        :host {
            padding: 8px 24px;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `,
    state() {
        return {
            saveError: undefined as string | undefined,
            isSaving: false,
            editedSettings: undefined as undefined | AppSettings,
        };
    },
    render({inputs, state, updateState, dispatch, events}) {
        const authTokensEntry = renderAsync(
            inputs.currentAppSettings,
            html`
                <span>Loading tokens...</span>
            `,
            (resolvedSettings) => html`
                <${VirAuthTokenEntry.assign({
                    authTokensWithEdits:
                        state.editedSettings?.authTokens || resolvedSettings.authTokens,
                    disabled: state.isSaving,
                    secretEncryptionKey: inputs.secretEncryptionKey,
                })}
                    ${listen(VirAuthTokenEntry.events.authTokensChange, (event) => {
                        updateState({
                            editedSettings: {
                                ...(state.editedSettings || resolvedSettings),
                                authTokens: event.detail,
                            },
                        });
                    })}
                ></${VirAuthTokenEntry}>
            `,
        );

        const saveButtonTitle = state.editedSettings ? undefined : 'No changes have been made yet.';

        const errorElement = state.saveError
            ? html`
                  <p><${VirErrorMessage}>${state.saveError}</${VirErrorMessage}></p>
              `
            : nothing;

        async function saveSettings() {
            if (!state.editedSettings) {
                /** Nothing to save. */
                return;
            }
            updateState({
                isSaving: true,
                saveError: undefined,
            });

            try {
                try {
                    await Promise.all(
                        getObjectTypedEntries(state.editedSettings.authTokens).map(
                            async ([
                                serviceName,
                                authTokens,
                            ]) => {
                                authTokens.forEach((authToken) =>
                                    assertValidAuthToken(authToken, serviceName),
                                );

                                await saveServiceAuthTokens({
                                    authTokens,
                                    serviceName,
                                    secretEncryptionKey: inputs.secretEncryptionKey,
                                });
                            },
                        ),
                    );

                    await removeUnusedServiceAuthTokens(getEnumValues(GitServiceName));
                } catch (error) {
                    const errorMessage = extractErrorMessage(error);
                    log.error(errorMessage);
                    updateState({
                        saveError: errorMessage,
                    });

                    return;
                }

                /** Artificially make it look like something more interesting is happening 😉. */
                await wait({
                    seconds: 1,
                });

                dispatch(new events.settingsChange(state.editedSettings));
                updateState({
                    editedSettings: undefined,
                });
                dispatch(new ChangeRouteEvent(defaultReviewVirFullRoute));
                await waitUntil(() =>
                    window.location.pathname.startsWith('/' + defaultReviewVirFullRoute.paths[0]),
                );

                globalThis.location.reload();
            } finally {
                updateState({
                    isSaving: false,
                });
            }
        }

        return html`
            <h1>Settings</h1>
            <section class="actions">
                <${ViraButton.assign({
                    text: 'Cancel',
                    isDisabled: state.isSaving,
                    color: ViraColorVariant.Danger,
                    buttonEmphasis: ViraEmphasis.Subtle,
                })}
                    ${listen('click', () => {
                        updateState({
                            editedSettings: undefined,
                        });
                        dispatch(new ChangeRouteEvent(defaultReviewVirFullRoute));
                    })}
                ></${ViraButton}>
                <${ViraButton.assign({
                    text: 'Save',
                    isDisabled: !state.editedSettings || state.isSaving,
                    color: ViraColorVariant.Positive,
                })}
                    title=${ifDefined(saveButtonTitle)}
                    ${listen('click', async () => {
                        await saveSettings();
                    })}
                ></${ViraButton}>
                <${ViraIcon.assign({
                    icon: state.isSaving ? LoaderAnimated24Icon : undefined,
                })}></${ViraIcon}>
            </section>

            ${errorElement}
            <h2>Auth tokens</h2>
            ${authTokensEntry}
        `;
    },
});
