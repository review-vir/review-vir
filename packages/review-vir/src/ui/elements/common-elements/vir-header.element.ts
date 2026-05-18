import {css, defineElement, html} from 'element-vir';
import {Options24Icon, ViraIcon, ViraLink} from 'vira';
import {ReviewVirMainPath, type ReviewVirRouter} from '../../../data/routing.js';

export const VirHeader = defineElement<{
    router: Readonly<ReviewVirRouter>;
}>()({
    tagName: 'vir-header',
    styles: css`
        header {
            display: flex;
            justify-content: space-between;

            & > * {
                display: flex;
                align-items: center;
            }

            & .updates,
            & .settings-link {
                opacity: 0.4;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            & .settings-link {
                margin-right: 16px;
            }
        }
    `,
    render({inputs}) {
        return html`
            <header>
                <div>
                    <slot></slot>
                </div>
                <${ViraLink.assign({
                    route: {
                        router: inputs.router,
                        route: {
                            paths: [ReviewVirMainPath.Settings],
                        },
                    },
                })}>
                    <div class="settings-link">
                        <${ViraIcon.assign({
                            icon: Options24Icon,
                        })}></${ViraIcon}>
                        Settings
                    </div>
                </${ViraLink}>
            </header>
        `;
    },
});
