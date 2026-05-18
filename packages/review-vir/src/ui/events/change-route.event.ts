import {defineTypedEvent} from 'element-vir';
import {type ReviewVirFullRoute} from '../../data/routing.js';

export const ChangeRouteEvent =
    defineTypedEvent<Readonly<Partial<Readonly<ReviewVirFullRoute>>>>()('change-route');
