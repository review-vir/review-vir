import type {Values} from '@augment-vir/common';
import type {PullRequestsByOwner} from '@review-vir/adapter-core';
import {css, defineElement, html, nothing} from 'element-vir';
import {ViraImage, viraTheme} from 'vira';
import {avatarSize} from '../../../styles/size.js';

export const VirOrgReviewers = defineElement<{
    reviewers: Values<PullRequestsByOwner>['reviewers'];
}>()({
    tagName: 'vir-org-reviewers',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
        }

        ${ViraImage} {
            max-height: ${avatarSize}px;
            max-width: ${avatarSize}px;
            min-height: ${avatarSize}px;
            min-width: ${avatarSize}px;
            box-sizing: border-box;
            border-radius: 50%;
            border: 2px solid ${viraTheme.colors['vira-grey-foreground-invisible'].foreground.value};
        }

        :host > * {
            display: flex;
            align-items: center;
            gap: 2px;
        }
    `,
    render({inputs}) {
        const sortedReviewers = Object.values(inputs.reviewers).sort((a, b) => b.count - a.count);
        return sortedReviewers.map((reviewer) => {
            if (!reviewer.count) {
                return nothing;
            }

            return html`
                <span
                    title="${reviewer.user
                        .username} is primary or code owner of ${reviewer.count} open pull requests."
                >
                    <${ViraImage.assign({
                        imageUrl: reviewer.user.avatarUrl,
                    })}></${ViraImage}>
                    ${reviewer.count}
                </span>
            `;
        });
    },
});
