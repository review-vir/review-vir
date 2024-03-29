import {extractErrorMessage, isTruthy} from '@augment-vir/common';
import {classMap, css, defineElement, html, isError, renderIf} from 'element-vir';
import {Writable} from 'type-fest';
import {
    StatusFailure24Icon,
    StatusInProgress24Icon,
    StatusSuccess24Icon,
    ViraIcon,
    ViraIconSvg,
} from 'vira';
import {
    PullRequest,
    PullRequestMergeStatus,
    PullRequestReviewStatus,
} from '../../../../../data/git/pull-request';
import {User} from '../../../../../data/git/user';
import {VirUsers} from '../../../common-elements/vir-users.element';

export const VirPullRequest = defineElement<{
    user: Readonly<User>;
    pullRequest: Readonly<PullRequest>;
    nested: boolean;
}>()({
    tagName: 'vir-pull-request',
    styles: css`
        :host {
            display: flex;
        }

        a {
            color: inherit;
        }
        a:hover {
            color: blue;
        }

        .rows {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .columns {
            display: flex;
            flex-direction: row;
            gap: 4px;
        }

        .center {
            align-items: center;
        }

        .grow {
            flex-grow: 1;
        }

        .pull-request {
            border-radius: 8px;
            border: 2px solid #ccc;
            padding: 8px;
        }

        .pull-request.needs-review {
            border-color: dodgerblue;
        }

        .pull-request.is-draft {
            border-color: #f5f5f5;
        }

        .pull-request-title-line {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .subtitle {
            font-size: 0.9em;
        }

        .faint {
            color: #999;
        }

        .error {
            color: orange;
        }
        .fail {
            color: red;
        }
        .inProgress {
            color: dodgerblue;
        }
        .success {
            color: green;
        }

        .checks {
            display: flex;
            gap: 4px;
        }

        .nested {
            flex-shrink: 0;
            color: #ccc;
            height: 40px;
            width: 40px;
            font-size: 2em;
            font-weight: bold;
            transform: rotate(-90deg);
        }

        .select-all {
            user-select: all;
            -webkit-user-select: all;
        }
    `,
    renderCallback({inputs}) {
        const assignees = Object.values(inputs.pullRequest.users.assignees).filter(isTruthy);

        const checksIconKey: keyof typeof checkIcons =
            inputs.pullRequest.status.checksStatus instanceof Error
                ? 'error'
                : inputs.pullRequest.status.checksStatus.failCount
                  ? 'fail'
                  : inputs.pullRequest.status.checksStatus.inProgressCount
                    ? 'inProgress'
                    : 'success';
        const checksTitle =
            inputs.pullRequest.status.checksStatus instanceof Error
                ? [
                      'Error',
                      extractErrorMessage(inputs.pullRequest.status.checksStatus),
                  ].join(': ')
                : inputs.pullRequest.status.checksStatus.failCount
                  ? [
                        inputs.pullRequest.status.checksStatus.failCount,
                        'checks failed.',
                    ].join(' ')
                  : inputs.pullRequest.status.checksStatus.inProgressCount
                    ? [
                          inputs.pullRequest.status.checksStatus.inProgressCount,
                          'check in progress.',
                      ].join(' ')
                    : 'All checks passed.';

        const baseBranchName: string | undefined = isError(
            inputs.pullRequest.branches.headBranch.branchName,
        )
            ? undefined
            : inputs.pullRequest.branches.headBranch.branchName;

        const headBranchName: string | undefined = isError(
            inputs.pullRequest.branches.targetBranch.branchName,
        )
            ? undefined
            : inputs.pullRequest.branches.targetBranch.branchName;

        return html`
            ${renderIf(
                inputs.nested,
                html`
                    <div class="nested">↱</div>
                `,
            )}
            <div
                class="pull-request rows grow ${classMap({
                    'needs-review': inputs.pullRequest.status.needsReviewFromCurrentUser,
                    'is-draft':
                        inputs.pullRequest.status.mergeStatus === PullRequestMergeStatus.Draft,
                })}"
            >
                <div class="columns title">
                    <div class="rows grow">
                        <div class="columns center">
                            <span class="faint">
                                ${inputs.pullRequest.branches.headBranch.repo.repoName}
                            </span>
                            <div class="checks">
                                <${ViraIcon.assign({
                                    icon: checkIcons[checksIconKey],
                                })}
                                    class=${checksIconKey}
                                    title=${checksTitle}
                                ></${ViraIcon}>
                                <${VirUsers.assign({
                                    users: assignees,
                                    overlap: true,
                                })}></${VirUsers}>
                            </div>
                        </div>
                        <a href=${inputs.pullRequest.id.htmlUrl}>
                            <b>#${inputs.pullRequest.id.prNumber}:</b>
                            ${inputs.pullRequest.id.title}
                        </a>
                    </div>
                    <${VirUsers.assign({
                        ...calculateReviewers(inputs.pullRequest.users.reviewers),
                        overlap: false,
                        holdStatusSpace: true,
                    })}></${VirUsers}>
                </div>
                ${renderIf(
                    !!(baseBranchName || headBranchName),
                    html`
                        <div class="subtitle faint">
                            <span class="select-all">${headBranchName}</span>
                            ←
                            <span class="select-all">${baseBranchName}</span>
                        </div>
                    `,
                )}
            </div>
        `;
    },
});

function calculateReviewers(reviewers: Readonly<PullRequest['users']['reviewers']>): {
    users: Readonly<User>[];
    statuses: NonNullable<(typeof VirUsers.inputsType)['statuses']>;
} {
    const statuses: Writable<NonNullable<(typeof VirUsers.inputsType)['statuses']>> = {};
    const users: Readonly<User>[] = [];

    Object.values(reviewers.pending).forEach((pendingReviewer) => {
        if (!pendingReviewer) {
            return;
        }

        statuses[pendingReviewer.username] = undefined;
        users.push(pendingReviewer);
    });

    Object.values(reviewers.submitted).forEach((submittedReviewer) => {
        if (!submittedReviewer) {
            return;
        }
        const reviewStatus = submittedReviewer.reviewStatus === PullRequestReviewStatus.Accepted;
        const reviewString = reviewStatus ? 'approved' : 'rejected';

        statuses[submittedReviewer.user.username] = {
            status: reviewStatus,
            description: `${submittedReviewer.user.username} has ${reviewString} this pull request.`,
        };
        users.push(submittedReviewer.user);
    });

    return {statuses, users};
}

const checkIcons = {
    error: StatusInProgress24Icon,
    fail: StatusFailure24Icon,
    inProgress: StatusInProgress24Icon,
    success: StatusSuccess24Icon,
} as const satisfies Readonly<Record<string, ViraIconSvg>>;
