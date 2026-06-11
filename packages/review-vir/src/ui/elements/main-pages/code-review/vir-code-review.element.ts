import {omitObjectKeys} from '@augment-vir/common';
import {
    countChainedPullRequests,
    getGitAdapterGlobalVars,
    type ChainedPullRequest,
    type GitUpdatesStoppedReason,
    type PullRequestsByOwner,
} from '@review-vir/adapter-core';
import {type FullDate} from 'date-vir';
import {classMap, css, defineElement, html, listen, type TemplateResult} from 'element-vir';
import {
    Copy24Icon,
    createSizedIcon,
    LoaderAnimated24Icon,
    StatusSuccess24Icon,
    ViraButton,
    ViraColorVariant,
    ViraEmphasis,
    ViraError,
    ViraIcon,
    ViraSize,
} from 'vira';
import type {GitServiceName} from '../../../../data/all-adapters.js';
import {
    GitDataLoader,
    GitDataUpdated,
    GitErrorEvent,
    GitUpdatesPausedEvent,
    GitUpdateStartEvent,
} from '../../../../data/git-loader.js';
import {getEarliestUpdateTime, organizeGitData} from '../../../../data/organize-git-data.js';
import {
    ReviewVirMainPath,
    type ReviewVirFullRoute,
    type ReviewVirRouter,
} from '../../../../data/routing.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
import {VirHeader} from '../../common-elements/vir-header.element.js';
import {VirPausedBanner} from '../../common-elements/vir-paused-banner.element.js';
import {VirOrgReviewers} from './vir-org-reviewers.element.js';
import {VirOrgSelector} from './vir-org-selector.element.js';
import {pullRequestMaxWidth, VirPullRequest} from './vir-pull-request.element.js';
import {VirUpdateTime} from './vir-update-time.element.js';

type PausedAdapter = {
    message: string;
    reason: GitUpdatesStoppedReason;
    resetAt: FullDate | undefined;
};

const offlineModeUseMockResponse = false as boolean;

export const VirCodeReview = defineElement<{
    secretEncryptionKey: string;
    router: Readonly<ReviewVirRouter>;
    currentRoute: Readonly<ReviewVirFullRoute>;
}>()({
    tagName: 'vir-code-review',
    styles: css`
        :host {
            container-type: inline-size;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .nothing {
            opacity: 0.6;
        }

        main {
            display: flex;
            gap: 32px;
            overflow: hidden;
        }

        .pull-request-list {
            max-width: 100%;
            display: flex;
            flex-grow: 1;
            gap: 8px;
            flex-direction: column;
            overflow: hidden;
            max-width: ${pullRequestMaxWidth}px;
        }
        @container (max-width: 800px) {
            main {
                flex-direction: column;
            }
        }

        .org-panel {
            display: flex;
            gap: 8px;
        }

        .hidden {
            visibility: hidden;
        }

        .updates {
            opacity: 0.4;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    `,
    state() {
        return {
            gitLoader: undefined as GitDataLoader | undefined,
            errorMessage: undefined as string | undefined,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            pausedAdapters: {} as Partial<Record<GitServiceName, PausedAdapter>>,
            data: undefined as undefined | PullRequestsByOwner,
            updateTime: undefined as undefined | FullDate,
            isUpdating: true,
            showCopiedSuccess: false,
            copyResetTimeoutId: undefined as undefined | ReturnType<typeof globalThis.setTimeout>,
        };
    },
    init({state, updateState, inputs}) {
        const gitLoader = new GitDataLoader(inputs.secretEncryptionKey, {
            seconds: 60,
        });
        gitLoader.listen(GitErrorEvent, (event) => {
            updateState({
                errorMessage: event.detail.message,
            });
        });
        gitLoader.listen(GitUpdatesPausedEvent, (event) => {
            updateState({
                pausedAdapters: {
                    ...state.pausedAdapters,
                    [event.detail.serviceName]: {
                        message: event.detail.message,
                        reason: event.detail.reason,
                        resetAt: event.detail.resetAt,
                    },
                },
            });
        });
        gitLoader.listen(GitUpdateStartEvent, () => {
            updateState({
                isUpdating: true,
                errorMessage: undefined,
            });
        });
        gitLoader.listen(GitDataUpdated, (event) => {
            updateState({
                isUpdating: Object.values(gitLoader.updatesInProgress).some((value) => value),
                data: organizeGitData(event.detail.data),
                updateTime: getEarliestUpdateTime(event.detail.data),
            });
        });

        gitLoader.startAutoUpdates();

        updateState({
            gitLoader,
        });
    },
    cleanup({state, updateState}) {
        state.gitLoader?.destroy();
        globalThis.clearTimeout(state.copyResetTimeoutId);
        updateState({
            gitLoader: undefined,
            copyResetTimeoutId: undefined,
        });
    },
    render({state, inputs, dispatch, updateState}) {
        const latestData: PullRequestsByOwner =
            (offlineModeUseMockResponse
                ? (getGitAdapterGlobalVars().mockResponse as PullRequestsByOwner)
                : undefined) ||
            state.data ||
            {};

        const allOrgNames = Object.keys(latestData).sort();

        const selectedOrgName: string = inputs.currentRoute.paths[1] || allOrgNames[0] || '';

        if (
            inputs.currentRoute.paths[0] === ReviewVirMainPath.CodeReview &&
            allOrgNames.length &&
            !inputs.currentRoute.paths[1]
        ) {
            dispatch(
                new ChangeRouteEvent({
                    paths: [
                        ReviewVirMainPath.CodeReview,
                        selectedOrgName,
                    ],
                }),
            );
        }

        const selectedOrg = latestData[selectedOrgName];

        const selectedPullRequests = selectedOrg?.pullRequests || {
            assigned: [],
            reviewer: [],
        };

        const reviewerCounts = countChainedPullRequests(selectedPullRequests.reviewer);

        const mainTemplate = html`
            <div class="org-panel">
                <${VirOrgSelector.assign({
                    pullRequestsByOrg: latestData,
                    selectedOrgName,
                })}></${VirOrgSelector}>
                <${VirOrgReviewers.assign({
                    reviewers: selectedOrg?.reviewers || {},
                })}></${VirOrgReviewers}>
            </div>
            <section class="pull-request-list">
                <h2>Reviewer (${reviewerCounts.notReviewed} / ${reviewerCounts.total})</h2>
                ${selectedPullRequests.reviewer.length
                    ? expandChainedPullRequests(selectedPullRequests.reviewer)
                    : html`
                          <p class="nothing">None.</p>
                      `}
            </section>
            <section class="pull-request-list">
                <h2>Assignee (${countChainedPullRequests(selectedPullRequests.assigned).total})</h2>
                ${selectedPullRequests.assigned.length
                    ? expandChainedPullRequests(selectedPullRequests.assigned)
                    : html`
                          <p class="nothing">None.</p>
                      `}
            </section>
        `;

        const pausedEntries = Object.entries(state.pausedAdapters) as ReadonlyArray<
            readonly [
                GitServiceName,
                PausedAdapter,
            ]
        >;
        const pausedBanners = pausedEntries.map(
            ([
                serviceName,
                paused,
            ]) => html`
                <${VirPausedBanner.assign({
                    serviceName,
                    message: paused.message,
                    resetAt: paused.resetAt,
                })}
                    ${listen(VirPausedBanner.events.resume, () => {
                        if (!state.gitLoader) {
                            return;
                        }
                        updateState({
                            pausedAdapters: omitObjectKeys(state.pausedAdapters, [
                                serviceName,
                            ]),
                        });
                        state.gitLoader.restartService(serviceName);
                    })}
                ></${VirPausedBanner}>
            `,
        );

        return html`
            <${VirHeader.assign({
                router: inputs.router,
            })}>
                <div class="updates">
                    <${ViraIcon.assign({
                        icon: LoaderAnimated24Icon,
                    })}
                        class=${classMap({
                            hidden: !state.isUpdating,
                            dim: true,
                        })}
                    ></${ViraIcon}>
                    <span>Updated:</span>
                    <span>
                        <${VirUpdateTime.assign({
                            updateTime: state.updateTime,
                        })}></${VirUpdateTime}>
                    </span>
                    <${ViraButton.assign({
                        icon: createSizedIcon(
                            state.showCopiedSuccess ? StatusSuccess24Icon : Copy24Icon,
                            16,
                        ),
                        buttonEmphasis: ViraEmphasis.Subtle,
                        buttonSize: ViraSize.Small,
                        color: state.showCopiedSuccess
                            ? ViraColorVariant.Positive
                            : ViraColorVariant.Plain,
                    })}
                        title="copy current JSON"
                        ${listen('click', async () => {
                            await globalThis.navigator.clipboard.writeText(
                                JSON.stringify(latestData, undefined, 4),
                            );
                            globalThis.clearTimeout(state.copyResetTimeoutId);
                            updateState({
                                showCopiedSuccess: true,
                                copyResetTimeoutId: globalThis.setTimeout(() => {
                                    updateState({
                                        showCopiedSuccess: false,
                                        copyResetTimeoutId: undefined,
                                    });
                                }, 1500),
                            });
                        })}
                    ></${ViraButton}>
                </div>
            </${VirHeader}>
            ${pausedBanners}
            <${ViraError}>
                ${state.errorMessage ||
                html`
                    &nbsp;
                `}
            </${ViraError}>
            <main>
                ${allOrgNames.length
                    ? mainTemplate
                    : html`
                          <p class="nothing">No pull requests to display.</p>
                      `}
            </main>
        `;
    },
});

function expandChainedPullRequests(
    pullRequests: ReadonlyArray<Readonly<ChainedPullRequest>>,
    isChild = false,
): TemplateResult[] {
    return pullRequests.flatMap(({children, pullRequest}) => {
        const childTemplates = expandChainedPullRequests(children, true);

        return [
            html`
                <${VirPullRequest.assign({
                    pullRequest,
                    isChild,
                })}></${VirPullRequest}>
            `,
            ...childTemplates,
        ];
    });
}
