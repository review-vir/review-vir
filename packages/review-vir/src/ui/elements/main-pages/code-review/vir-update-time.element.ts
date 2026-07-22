import {type FullDate} from 'date-vir';
import {defineElement, html, nothing} from 'element-vir';
import {ViraRelativeTime} from 'vira';

export const VirUpdateTime = defineElement<{updateTime: Readonly<FullDate> | undefined}>()({
    tagName: 'vir-update-time',
    render({inputs}) {
        if (!inputs.updateTime) {
            return nothing;
        }

        /**
         * `ViraRelativeTime` keeps the relative string live on its own and exposes the exact
         * timestamp in its `title` tooltip, so this element only needs to handle the "no update
         * time yet" case.
         */
        return html`
            <${ViraRelativeTime.assign({
                time: inputs.updateTime,
            })}></${ViraRelativeTime}>
        `;
    },
});
