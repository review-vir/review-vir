import {css, defineElement, html} from 'element-vir';

export const VirErrorMessage = defineElement()({
    tagName: 'vir-error-message',
    styles: css`
        :host {
            color: red;
            font-weight: bold;
        }
    `,
    render() {
        return html`
            <slot></slot>
        `;
    },
});
