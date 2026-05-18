import {arrayToObject, getEnumValues, getObjectTypedEntries} from '@augment-vir/common';
import {PullRequestDisplayStatus, type PullRequest} from '@review-vir/adapter-core';
import {css, defineElement, html, ifDefined, nothing, unsafeCSS} from 'element-vir';
import {
    Chat24Icon,
    Commit24Icon,
    Document24Icon,
    Pencil24Icon,
    Shield24Icon,
    Star24Icon,
    StatusFailure24Icon,
    StatusInProgress24Icon,
    StatusSuccess24Icon,
    ViraIcon,
    viraIconCssVars,
    ViraLink,
    type ViraIconSvg,
} from 'vira';
import {sharedColors} from '../../../styles/color.js';
import {VirUsers} from './vir-users.element.js';

export const pullRequestMaxWidth = 800;

const statusHostClasses = arrayToObject(getEnumValues(PullRequestDisplayStatus), (enumValue) => {
    return {
        key: `vir-pull-request-status-${enumValue}`,
        value: ({inputs}: {inputs: {pullRequest: Readonly<PullRequest>}}) =>
            inputs.pullRequest.status.displayStatus === enumValue,
    };
});

const statusConfigs: Record<
    PullRequestDisplayStatus,
    {
        /** An `undefined` border color will just be black. */
        borderColor: string | undefined;
        /** `undefined` icon color inherits its icon color from the borderColor. */
        iconColor: string | undefined;
        /** An `undefined` icon will be rendered in other ways. */
        icon: ViraIconSvg | undefined;
        /** This will be the hover text for the icon. */
        description: string | undefined;
    }
> = {
    [PullRequestDisplayStatus.Draft]: {
        icon: Pencil24Icon,
        borderColor: undefined,
        iconColor: undefined,
        description: 'This pull request is a draft.',
    },
    [PullRequestDisplayStatus.ReadyToMerge]: {
        icon: StatusSuccess24Icon,
        borderColor: sharedColors.success,
        iconColor: undefined,
        description: 'This pull request is ready to merge!',
    },
    [PullRequestDisplayStatus.Waiting]: {
        icon: StatusInProgress24Icon,
        borderColor: undefined,
        iconColor: sharedColors.inProgress,
        description: 'This pull request is waiting for reviews or builds to finish.',
    },

    [PullRequestDisplayStatus.PrimaryReviewer]: {
        icon: Star24Icon,
        borderColor: 'orange',
        iconColor: undefined,
        description: 'You are a primary reviewer of this pull request!',
    },
    [PullRequestDisplayStatus.CodeOwner]: {
        icon: Shield24Icon,
        borderColor: 'dodgerblue',
        iconColor: undefined,
        description: 'You are a code owner reviewer of this pull request!',
    },

    [PullRequestDisplayStatus.MergeConflicts]: {
        icon: StatusFailure24Icon,
        borderColor: undefined,
        iconColor: sharedColors.error,
        description: 'This pull request has merge conflicts.',
    },
    [PullRequestDisplayStatus.BuildFailureInProgress]: {
        icon: undefined,
        borderColor: undefined,
        iconColor: undefined,
        description: undefined,
    },
    [PullRequestDisplayStatus.BuildFailureFinished]: {
        icon: undefined,
        borderColor: undefined,
        iconColor: undefined,
        description: undefined,
    },
    [PullRequestDisplayStatus.UnresolvedComments]: {
        icon: Chat24Icon,
        borderColor: undefined,
        iconColor: sharedColors.error,
        description: 'This pull request has unresolved comments.',
    },
};

const statusStyles = getObjectTypedEntries(statusConfigs)
    .map(
        ([
            status,
            config,
        ]): string => {
            const iconColor = config.iconColor || config.borderColor;

            const styleContents = [
                config.borderColor ? `--vir-pull-request-border-color: ${config.borderColor};` : '',
                iconColor ? `--vir-pull-request-icon-color: ${iconColor};` : '',
            ].join('');

            if (!styleContents) {
                return '';
            }

            const selector = `:host(.vir-pull-request-status-${status})`;

            return `${selector} {${styleContents}}`;
        },
    )
    .join('\n');

export const VirPullRequest = defineElement<{
    isChild: boolean;
    pullRequest: Readonly<PullRequest>;
}>()({
    tagName: 'vir-pull-request',
    hostClasses: {
        ...statusHostClasses,
        'vir-pull-request-reviewed': ({inputs}) =>
            !inputs.pullRequest.currentUser.isAssignee &&
            inputs.pullRequest.currentUser.hasReviewed,
    },
    cssVars: {
        'vir-pull-request-border-color': '#cbcbcb',
        'vir-pull-request-icon-color': '#cbcbcb',
    },
    styles: ({hostClasses, cssVars}) => css`
        :host {
            display: flex;
            width: 100%;
            max-width: ${pullRequestMaxWidth}px;
        }

        .child-marker {
            flex-shrink: 0;
            color: rgb(204, 204, 204);
            height: 40px;
            width: 40px;
            font-size: 2em;
            font-weight: bold;
            transform: rotate(-90deg);
        }

        .pull-request {
            display: flex;
            gap: 4px;
            flex-direction: column;
            border-radius: 8px;
            border: 2px solid ${cssVars['vir-pull-request-border-color'].value};
            padding: 6px 8px;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
        }

        .pull-request-number,
        .branches {
            opacity: 0.4;
        }

        :host(
                .vir-pull-request-status-${unsafeCSS(
                        PullRequestDisplayStatus.BuildFailureInProgress,
                    )}
            )
            .status-failures {
            border-color: ${unsafeCSS(sharedColors.inProgress)};
        }

        ${unsafeCSS(statusStyles)}

        ${hostClasses['vir-pull-request-reviewed'].selector}, :host(
                .vir-pull-request-status-${unsafeCSS(PullRequestDisplayStatus.Draft)}
            ) {
            opacity: 0.3;

            ${cssVars['vir-pull-request-border-color'].name}: ${unsafeCSS(
                cssVars['vir-pull-request-border-color'].default,
            )};
        }

        .branches {
            display: flex;
            gap: 4px;

            & .repo-name,
            & .branch-name {
                white-space: nowrap;
            }

            & .repo-name {
                margin-right: 4px;
            }

            & .branch-name {
                user-select: all;
                -webkit-user-select: all;
                text-overflow: ellipsis;
                overflow: hidden;
            }
        }

        .double-row {
            display: flex;
            gap: 8px;

            & .left {
                display: flex;
                flex-grow: 1;
                flex-direction: column;
                gap: 4px;
                overflow: hidden;

                & .top-row {
                    display: flex;
                    gap: 4px;

                    & .status-failures {
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 24px;
                        width: 24px;
                        flex-shrink: 0;
                        color: red;
                        border-radius: 50%;
                        border: 1px solid ${unsafeCSS(sharedColors.error)};
                    }

                    & .assignees {
                        margin-right: 8px;
                    }

                    & .labels {
                        display: flex;
                        white-space: nowrap;
                        flex-shrink: 1;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        align-items: center;
                        gap: 8px;
                        font-size: 0.8em;
                        opacity: 0.4;
                    }

                    & .status-icon {
                        ${viraIconCssVars['vira-icon-stroke-color'].name}: ${cssVars[
                            'vir-pull-request-icon-color'
                        ].value};
                    }

                    & .stats {
                        display: flex;
                        opacity: 0.4;
                        align-items: center;
                        margin-left: auto;

                        & > * {
                            padding: 0 2px;
                            display: flex;
                            align-items: center;
                        }
                    }
                }

                & .title {
                    font-weight: bold;
                }
            }
        }
    `,
    render({inputs}) {
        const statusIconSvg = statusConfigs[inputs.pullRequest.status.displayStatus].icon;
        const failCount: number = inputs.pullRequest.status.checksStatus?.failCount || 0;
        const statusIconTitle = statusConfigs[inputs.pullRequest.status.displayStatus].description;
        const statusFailuresTitle = `${failCount} build failure${failCount === 1 ? '' : 's'} and builds are ${inputs.pullRequest.status.displayStatus === PullRequestDisplayStatus.BuildFailureFinished ? 'finished' : 'still in progress'}.`;

        const statusIconTemplate = statusIconSvg
            ? html`
                  <${ViraIcon.assign({
                      icon: statusIconSvg,
                  })}
                      class="status-icon"
                      title=${ifDefined(statusIconTitle)}
                  ></${ViraIcon}>
              `
            : html`
                  <span class="status-failures" title=${statusFailuresTitle}>${failCount}</span>
              `;

        const childMarkerTemplate = inputs.isChild
            ? html`
                  <div class="child-marker">↱</div>
              `
            : nothing;

        const labelTemplates = inputs.pullRequest.status.pullRequestLabels.map(
            (label) => html`
                <span class="label">${label.name}</span>
            `,
        );

        return html`
            ${childMarkerTemplate}
            <div class="pull-request">
                <div class="double-row">
                    <div class="left">
                        <div class="top-row">
                            ${statusIconTemplate}
                            <${VirUsers.assign({
                                overlap: true,
                                users: Object.values(inputs.pullRequest.users.assignees),
                                fadedAvatar: false,
                            })}
                                class="assignees"
                            ></${VirUsers}>
                            <span class="labels">${labelTemplates}</span>
                            <span class="stats">
                                <span
                                    title="${inputs.pullRequest.changes.additions} addition${inputs
                                        .pullRequest.changes.additions === 1
                                        ? ''
                                        : 's'}"
                                >
                                    +${inputs.pullRequest.changes.additions}
                                </span>
                                <span
                                    title="${inputs.pullRequest.changes.deletions} deletion${inputs
                                        .pullRequest.changes.deletions === 1
                                        ? ''
                                        : 's'}"
                                >
                                    -${inputs.pullRequest.changes.deletions}
                                </span>
                                <span
                                    title="${inputs.pullRequest.changes.changedFiles} file${inputs
                                        .pullRequest.changes.changedFiles === 1
                                        ? ''
                                        : 's'} changed"
                                >
                                    <${ViraIcon.assign({
                                        icon: Document24Icon,
                                    })}></${ViraIcon}>
                                    ${inputs.pullRequest.changes.changedFiles}
                                </span>
                                <span
                                    title="${inputs.pullRequest.status.comments.resolved}/${inputs
                                        .pullRequest.status.comments.total} resolved comment${inputs
                                        .pullRequest.status.comments.resolved === 1
                                        ? ''
                                        : 's'}"
                                >
                                    <${ViraIcon.assign({
                                        icon: Chat24Icon,
                                    })}></${ViraIcon}>
                                    ${inputs.pullRequest.status.comments.resolved}/${inputs
                                        .pullRequest.status.comments.total}
                                </span>
                                <span
                                    title="${inputs.pullRequest.status.commitCount} commit${inputs
                                        .pullRequest.status.commitCount === 1
                                        ? ''
                                        : 's'}"
                                >
                                    <${ViraIcon.assign({
                                        icon: Commit24Icon,
                                    })}></${ViraIcon}>
                                    ${inputs.pullRequest.status.commitCount}
                                </span>
                            </span>
                        </div>
                        <${ViraLink.assign({
                            link: {
                                newTab: true,
                                url: inputs.pullRequest.id.htmlUrl,
                            },
                        })}
                            class="title"
                        >
                            <span class="pull-request-number">
                                #${inputs.pullRequest.id.prNumber}:
                            </span>
                            ${inputs.pullRequest.id.title}
                        </${ViraLink}>
                    </div>
                    <div class="right">
                        <${VirUsers.assign({
                            overlap: true,
                            users: Object.values(inputs.pullRequest.users.reviewers),
                            holdStatusSpace: true,
                            fadedAvatar: true,
                        })}></${VirUsers}>
                    </div>
                </div>
                <div class="branches">
                    <${ViraLink.assign({
                        link: {
                            newTab: true,
                            url: inputs.pullRequest.branches.targetBranch.repo.htmlUrl,
                        },
                    })}
                        class="repo-name"
                        title="This pull request is in the ${inputs.pullRequest.branches
                            .targetBranch.repo.repoName} repository."
                    >
                        ${inputs.pullRequest.branches.targetBranch.repo.repoName}
                    </${ViraLink}>
                    <span class="branch-name">
                        ${inputs.pullRequest.branches.targetBranch.branchName}
                    </span>
                    <span>←</span>
                    <span class="branch-name">
                        ${inputs.pullRequest.branches.headBranch.branchName}
                    </span>
                </div>
            </div>
        `;
    },
});
