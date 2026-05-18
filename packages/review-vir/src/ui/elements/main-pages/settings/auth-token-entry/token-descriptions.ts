import {GithubAdapter} from '@review-vir/github-adapter';
import {type HTMLTemplateResult, html} from 'element-vir';
import type {GitServiceName} from '../../../../../data/all-adapters.js';

export type Permission = {label: string; value: string};

export const serviceAuthTokenDescriptions: Record<
    GitServiceName,
    {
        intro: HTMLTemplateResult;
        permissions: Permission[];
    }
> = {
    [GithubAdapter.serviceName]: {
        intro: html`
            You will need a
            <a href="https://github.com/settings/tokens?type=beta">
                Fine-grained Personal Access Token
            </a>
            with the following permissions:
        `,
        permissions: [
            {
                label: 'Commit statuses',
                value: 'Read-only',
            },
            {
                label: 'Contents',
                value: 'Read-only',
            },
            {
                label: 'Metadata',
                value: 'Read-only',
            },
            {
                label: 'Pull requests',
                value: 'Read-only',
            },
        ],
    },
};
