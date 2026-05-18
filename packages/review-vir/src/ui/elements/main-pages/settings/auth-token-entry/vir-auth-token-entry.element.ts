import {getEnumValues} from '@augment-vir/common';
import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {GitServiceName} from '../../../../../data/all-adapters.js';
import {type ServiceAuthTokens} from '../../../../../data/auth-tokens.js';
import {VirServiceAuthTokens} from './vir-service-auth-tokens.element.js';

export const VirAuthTokenEntry = defineElement<{
    authTokensWithEdits: ServiceAuthTokens;
    secretEncryptionKey: string;
    disabled: boolean;
}>()({
    tagName: 'vir-auth-token-entry',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 32px;
            padding: 0 32px;
            box-sizing: border-box;
        }

        .services {
            display: flex;
        }

        .actions {
            display: flex;
            gap: 16px;
            justify-content: center;
        }
    `,
    events: {
        authTokensChange: defineElementEvent<ServiceAuthTokens>(),
    },
    render({inputs, dispatch, events}) {
        const serviceAuthTokenEntryTemplates = getEnumValues(GitServiceName).map((serviceName) => {
            const currentAuthTokens = inputs.authTokensWithEdits[serviceName];

            const authTokens = currentAuthTokens.length
                ? currentAuthTokens
                : [
                      {
                          authTokenName: '',
                          authTokenSecret: '',
                      },
                  ];

            return html`
                <${VirServiceAuthTokens.assign({
                    authTokens,
                    serviceName,
                    disabled: inputs.disabled,
                })}
                    ${listen(VirServiceAuthTokens.events.authTokensChange, (event) => {
                        dispatch(
                            new events.authTokensChange({
                                ...inputs.authTokensWithEdits,
                                [serviceName]: event.detail,
                            }),
                        );
                    })}
                ></${VirServiceAuthTokens}>
            `;
        });

        return html`
            <section class="services">${serviceAuthTokenEntryTemplates}</section>
        `;
    },
});
