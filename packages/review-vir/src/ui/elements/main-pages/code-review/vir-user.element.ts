import {
    PullRequestReviewStatus,
    type GitUser,
    type PullRequestReview,
} from '@review-vir/adapter-core';
import {classMap, css, defineElement, html, ifDefined, nothing, unsafeCSS} from 'element-vir';
import {
    StatusFailure24Icon,
    StatusSuccess24Icon,
    ViraIcon,
    viraIconCssVars,
    ViraImage,
    type ViraIconSvg,
} from 'vira';
import {sharedColors} from '../../../styles/color.js';
import {avatarSize} from '../../../styles/size.js';

export const VirUser = defineElement<{
    user: Readonly<GitUser | PullRequestReview>;
    show: Readonly<{
        avatar: boolean;
        username: boolean;
        statusSpace?: boolean | undefined;
    }>;
    fadedAvatar: boolean;
}>()({
    tagName: 'vir-user',
    hostClasses: {
        'vir-user-faded': ({inputs}) => inputs.fadedAvatar,
    },
    styles: ({hostClasses}) => css`
        :host {
            ${viraIconCssVars['vira-icon-fill-color'].name}: white;
        }

        a {
            display: flex;
            align-items: center;
        }

        ${hostClasses['vir-user-faded'].selector} ${ViraImage} {
            opacity: 0.75;
        }

        ${ViraImage} {
            max-height: ${avatarSize}px;
            max-width: ${avatarSize}px;
            min-height: ${avatarSize}px;
            min-width: ${avatarSize}px;
            box-sizing: border-box;
            margin: 1px 0;
        }

        ${ViraIcon} {
            color: ${unsafeCSS(sharedColors.error)};
        }

        ${ViraIcon}.success {
            color: ${unsafeCSS(sharedColors.success)};
        }

        .avatar-border {
            position: absolute;
            left: -1px;
            border-radius: 50%;
            border: 3px solid #f0f0f0;
            box-sizing: border-box;
            height: ${avatarSize + 2}px;
            width: ${avatarSize + 2}px;
            pointer-events: none;
        }

        .avatar {
            display: flex;
            border-radius: 50%;
            background-color: white;
        }

        .avatar-and-review-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        .is-primary .avatar-border {
            border-color: ${unsafeCSS(sharedColors.primary)};
        }
        .is-code-owner .avatar-border {
            border-color: ${unsafeCSS(sharedColors.codeOwner)};
        }

        .placeholder {
            visibility: hidden;
        }
    `,
    render({inputs}) {
        const review: PullRequestReview | undefined =
            'user' in inputs.user ? inputs.user : undefined;
        const user = 'user' in inputs.user ? inputs.user.user : inputs.user;

        const statusIcon: ViraIconSvg | undefined =
            review == undefined || review.reviewStatus === PullRequestReviewStatus.Pending
                ? undefined
                : review.reviewStatus === PullRequestReviewStatus.Accepted
                  ? StatusSuccess24Icon
                  : StatusFailure24Icon;

        const shouldShowStatusPlaceholder = !!inputs.show.statusSpace && !statusIcon;

        const description: string | undefined =
            review == undefined || review.reviewStatus === PullRequestReviewStatus.Pending
                ? undefined
                : review.reviewStatus === PullRequestReviewStatus.Accepted
                  ? `${user.username} has accepted this pull request.`
                  : `${user.username} has requested changes on this pull request.`;

        const statusTemplate =
            statusIcon || shouldShowStatusPlaceholder
                ? html`
                      <${ViraIcon.assign({
                          icon: shouldShowStatusPlaceholder ? StatusFailure24Icon : statusIcon,
                          fitContainer: true,
                      })}
                          class="status-icon ${classMap({
                              success: review?.reviewStatus === PullRequestReviewStatus.Accepted,
                              placeholder: shouldShowStatusPlaceholder,
                          })}"
                          title=${ifDefined(description)}
                      ></${ViraIcon}>
                  `
                : nothing;
        const avatarTemplate = html`
            <div class="avatar-and-review-wrapper">
                <div class="avatar">
                    <${ViraImage.assign({
                        imageUrl: user.avatarUrl,
                    })}
                        title=${user.username}
                    ></${ViraImage}>
                </div>
                <div class="avatar-border"></div>
                ${statusTemplate}
            </div>
        `;

        const usernameTemplate = user.username;

        return html`
            <a
                href=${user.profileUrl}
                class=${classMap({
                    'is-primary': !!review?.isPrimaryReviewer,
                    'is-code-owner': !!review?.isCodeOwner,
                })}
            >
                ${inputs.show.avatar ? avatarTemplate : nothing}
                ${inputs.show.username ? usernameTemplate : nothing}
            </a>
        `;
    },
});
