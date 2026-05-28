import {mapObject} from '@augment-vir/common';
import type {PullRequestsByOwner} from '@review-vir/adapter-core';
import {classMap, css, defineElement, html, listen} from 'element-vir';
import {noNativeFormStyles, ViraImage, viraTheme} from 'vira';
import {ReviewVirMainPath} from '../../../../data/routing.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
import {avatarSize} from '../../../styles/size.js';

export const VirOrgSelector = defineElement<{
    pullRequestsByOrg: Readonly<PullRequestsByOwner>;
    selectedOrgName: string;
}>()({
    tagName: 'vir-org-selector',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .title {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .pull-request-count {
            opacity: 0.5;
            font-size: 0.8em;
            margin-left: 4px;
        }

        .org-selector {
            ${noNativeFormStyles};
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: 200px;

            border: 1px solid
                ${viraTheme.colors['vira-grey-foreground-decoration'].foreground.value};
            border-radius: 8px;
            padding: 12px 16px;
            color: ${viraTheme.colors['theme-default'].foreground.value};
            background-color: ${viraTheme.colors['theme-default'].background.value};
        }

        .org-selector:not(.selected):hover {
            background-color: ${viraTheme.colors['vira-blue-behind-fg-invisible'].background.value};
        }

        .org-selector.selected {
            background-color: ${viraTheme.colors['vira-blue-behind-fg-lowest-contrast'].background
                .value};
            border-color: ${viraTheme.colors['vira-blue-foreground-body'].foreground.value};
            border-width: 2px;
            padding: 11px 15px;
        }

        .org-logo {
            box-sizing: border-box;
            max-height: ${avatarSize}px;
            max-width: ${avatarSize}px;
            height: ${avatarSize}px;
            width: ${avatarSize}px;
            min-height: ${avatarSize}px;
            min-width: ${avatarSize}px;
        }
    `,
    render({inputs, dispatch}) {
        const orgSelections = createOrgSelections(inputs.pullRequestsByOrg);

        return Object.entries(orgSelections)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(
                ([
                    orgName,
                    {logoUrl, pullRequestCount},
                ]) => {
                    return html`
                        <button
                            class="org-selector ${classMap({
                                selected: inputs.selectedOrgName === orgName,
                            })}"
                            ${listen('click', () => {
                                dispatch(
                                    new ChangeRouteEvent({
                                        paths: [
                                            ReviewVirMainPath.CodeReview,
                                            orgName,
                                        ],
                                    }),
                                );
                            })}
                        >
                            <div class="title">
                                <${ViraImage.assign({
                                    imageUrl: logoUrl,
                                })}
                                    class="org-logo"
                                ></${ViraImage}>
                                ${orgName}
                            </div>
                            <div class="pull-request-count">
                                ${pullRequestCount} pull request${pullRequestCount > 1 ? 's' : ''}
                            </div>
                        </button>
                    `;
                },
            );
    },
});

type OrgSelections = {
    [OrgName in string]: {
        pullRequestCount: number;
        logoUrl: string;
    };
};

function createOrgSelections(pullRequestsByOrg: Readonly<PullRequestsByOwner>): OrgSelections {
    return mapObject(pullRequestsByOrg, (orgName, {owner, totalCount}) => {
        if (!totalCount) {
            return undefined;
        }

        return {
            key: orgName,
            value: {
                pullRequestCount: totalCount,
                logoUrl: owner.avatarUrl,
            },
        };
    });
}
