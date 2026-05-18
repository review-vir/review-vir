import {type GitUser, type PullRequestReview} from '@review-vir/adapter-core';
import {css, defineElement, html} from 'element-vir';
import {VirUser} from './vir-user.element.js';

export const VirUsers = defineElement<{
    users: ReadonlyArray<Readonly<GitUser | PullRequestReview>>;
    overlap: boolean;
    /** Hold space for review status icons below the user avatars. */
    holdStatusSpace?: boolean | undefined;
    fadedAvatar: boolean;
}>()({
    tagName: 'vir-users',
    hostClasses: {
        'vir-users-overlap-icons': ({inputs}) => inputs.overlap,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            align-items: center;
            align-items: flex-start;
        }

        ${VirUser} {
            font-size: 20px;
        }

        ${hostClasses['vir-users-overlap-icons'].selector} ${VirUser} + ${VirUser} {
            margin-left: -10px;
        }
    `,
    render({inputs}) {
        const sortedUsers = inputs.users.toSorted((a, b) => {
            const aUser: GitUser = 'user' in a ? a.user : a;
            const bUser: GitUser = 'user' in b ? b.user : b;

            return aUser.username.localeCompare(bUser.username);
        });

        const avatarTemplates = sortedUsers.map((user, index) => {
            return html`
                <${VirUser.assign({
                    user,
                    show: {
                        avatar: true,
                        username: false,
                        statusSpace: inputs.holdStatusSpace,
                    },
                    fadedAvatar: inputs.fadedAvatar,
                })}
                    style="z-index: ${index}"
                ></${VirUser}>
            `;
        });

        return html`
            ${avatarTemplates}
        `;
    },
});
