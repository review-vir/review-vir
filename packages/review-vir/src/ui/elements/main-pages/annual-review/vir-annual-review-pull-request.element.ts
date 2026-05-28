import {toFormattedString} from 'date-vir';
import {css, defineElement, html} from 'element-vir';
import {Document24Icon, ViraIcon, ViraLink, viraTheme} from 'vira';
import type {AnnualReviewPullRequest} from '../../../../data/annual-review.js';
import {sharedColors} from '../../../styles/color.js';

export const VirAnnualReviewPullRequest = defineElement<{pullRequest: AnnualReviewPullRequest}>()({
    tagName: 'vir-annual-review-pull-request',
    styles: css`
        :host {
            border-radius: 8px;
            border: 1px solid
                ${viraTheme.colors['vira-grey-foreground-decoration'].foreground.value};
            padding: 8px 16px;
            gap: 4px;
            display: flex;
            flex-direction: column;
        }

        .delete {
            color: ${sharedColors.error};
        }
        .add {
            color: ${sharedColors.success};
        }

        .stat,
        .stats {
            display: flex;
            align-items: center;
        }

        .stats {
            gap: 8px;
        }

        .date {
            opacity: 0.4;
        }
    `,
    render({inputs}) {
        return html`
            <div class="date">${toFormattedString(inputs.pullRequest.createdAt, 'MMMM d')}</div>
            <div class="title">
                <${ViraLink.assign({
                    link: {
                        newTab: true,
                        url: inputs.pullRequest.url,
                    },
                })}>
                    ${inputs.pullRequest.title}
                </${ViraLink}>
            </div>
            <div class="stats">
                <span
                    class="stat delete"
                    title="${inputs.pullRequest.deletions} deletion${inputs.pullRequest
                        .deletions === 1
                        ? ''
                        : 's'}"
                >
                    -${inputs.pullRequest.deletions}
                </span>
                <span
                    class="stat add"
                    title="${inputs.pullRequest.additions} addition${inputs.pullRequest
                        .additions === 1
                        ? ''
                        : 's'}"
                >
                    +${inputs.pullRequest.additions}
                </span>
                <span
                    class="stat"
                    title="${inputs.pullRequest.changedFiles} file${inputs.pullRequest
                        .changedFiles === 1
                        ? ''
                        : 's'} changed"
                >
                    <${ViraIcon.assign({
                        icon: Document24Icon,
                    })}></${ViraIcon}>
                    ${inputs.pullRequest.changedFiles}
                </span>
            </div>
        `;
    },
});
