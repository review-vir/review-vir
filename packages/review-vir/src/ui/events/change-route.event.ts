import {defineTypedCustomEvent} from 'element-vir';
import {type ReviewVirFullRoute} from '../../data/routing.js';

export const ChangeRouteEvent =
    defineTypedCustomEvent<Readonly<Partial<Readonly<ReviewVirFullRoute>>>>()('change-route');
