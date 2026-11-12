import {waitUntil} from '@augment-vir/assert';
import {
    extractErrorMessage,
    getEnumValues,
    getObjectTypedEntries,
    log,
    omitObjectKeys,
    removeDuplicates,
    wait,
} from '@augment-vir/common';
import {
    assertValidAuthToken,
    removeUnusedServiceAuthTokens,
    saveServiceAuthTokens,
} from '@review-vir/adapter-core';
import {
    asyncProp,
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
import {
    LoaderAnimated24Icon,
    ViraButton,
    ViraCheckbox,
    ViraColorVariant,
    ViraEmphasis,
    ViraError,
    ViraIcon,
    ViraThemeSwitcher,
} from 'vira';
import {GitServiceName} from '../../../../data/all-adapters.js';
import {getAllPullRequestDataCache} from '../../../../data/cache-store.js';
import {getRepoLabel, listKnownRepos} from '../../../../data/repos.js';
import {defaultReviewVirFullRoute} from '../../../../data/routing.js';
import {saveSettings as saveAppSettings, type AppSettings} from '../../../../data/settings.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
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

        .top-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .repo-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .repo-description {
            opacity: 0.6;
        }
    `,
    state() {
        return {
            saveError: undefined as string | undefined,
            isSaving: false,
            editedSettings: undefined as undefined | AppSettings,
            cachedGitData: asyncProp({
                defaultValue: getAllPullRequestDataCache(),
            }),
        };
    },
    render({inputs, state, updateState, dispatch, events}) {
        const authTokensEntry = renderAsync(
            inputs.currentAppSettings,
            html`
                <span>Loading tokens...</span>
            `,
            (resolvedSettings) => {
                return html`
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
                `;
            },
        );

        const reposEntry = renderAsync(
            inputs.currentAppSettings,
            html`
                <span>Loading repos...</span>
            `,
            (resolvedSettings) => {
                const currentSettings = state.editedSettings || resolvedSettings;
                const hiddenRepos = new Set(currentSettings.hiddenRepos);
                const knownRepoUrls = state.cachedGitData.isResolved()
                    ? listKnownRepos(state.cachedGitData.value).map((repo) => repo.htmlUrl)
                    : [];
                /** Keep hidden repos listed even once they have no PRs, so they can be un-hidden. */
                const repoUrls = removeDuplicates([
                    ...knownRepoUrls,
                    ...hiddenRepos,
                ]).toSorted((a, b) => getRepoLabel(a).localeCompare(getRepoLabel(b)));

                if (!repoUrls.length) {
                    return html`
                        <p class="repo-description">
                            No repos found yet. Repos show up here once their pull requests load.
                        </p>
                    `;
                }

                const repoTemplates = repoUrls.map((repoUrl) => {
                    return html`
                        <${ViraCheckbox.assign({
                            value: !hiddenRepos.has(repoUrl),
                            label: getRepoLabel(repoUrl),
                            useHorizontalLabel: true,
                            isDisabled: state.isSaving,
                        })}
                            title=${repoUrl}
                            ${listen(ViraCheckbox.events.valueChange, (event) => {
                                const isShown = event.detail;
                                const newHiddenRepos = new Set(currentSettings.hiddenRepos);
                                if (isShown) {
                                    newHiddenRepos.delete(repoUrl);
                                } else {
                                    newHiddenRepos.add(repoUrl);
                                }
                                updateState({
                                    editedSettings: {
                                        ...currentSettings,
                                        hiddenRepos: [...newHiddenRepos],
                                    },
                                });
                            })}
                        ></${ViraCheckbox}>
                    `;
                });

                return html`
                    <p class="repo-description">
                        Uncheck a repo to hide its pull requests. (${hiddenRepos.size} hidden)
                    </p>
                    <div class="repo-list">${repoTemplates}</div>
                `;
            },
        );

        const saveButtonTitle = state.editedSettings ? undefined : 'No changes have been made yet.';

        const errorElement = state.saveError
            ? html`
                  <p><${ViraError}>${state.saveError}</${ViraError}></p>
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
                                authTokens.forEach((authToken) => {
                                    return assertValidAuthToken(authToken, serviceName);
                                });

                                await saveServiceAuthTokens({
                                    authTokens,
                                    serviceName,
                                    secretEncryptionKey: inputs.secretEncryptionKey,
                                });
                            },
                        ),
                    );

                    await removeUnusedServiceAuthTokens(getEnumValues(GitServiceName));

                    await saveAppSettings(omitObjectKeys(state.editedSettings, ['authTokens']));
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

                dispatch(
                    new events.settingsChange({
                        detail: state.editedSettings,
                    }),
                );
                updateState({
                    editedSettings: undefined,
                });
                dispatch(
                    new ChangeRouteEvent({
                        detail: defaultReviewVirFullRoute,
                    }),
                );
                await waitUntil(() => {
                    return window.location.pathname.startsWith(
                        '/' + defaultReviewVirFullRoute.paths[0],
                    );
                });

                globalThis.location.reload();
            } finally {
                updateState({
                    isSaving: false,
                });
            }
        }

        return html`
            <div class="top-bar">
                <h1>Settings</h1>
                <${ViraThemeSwitcher}></${ViraThemeSwitcher}>
            </div>
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
                        dispatch(
                            new ChangeRouteEvent({
                                detail: defaultReviewVirFullRoute,
                            }),
                        );
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
            <h2>Repos</h2>
            ${reposEntry}
        `;
    },
});
