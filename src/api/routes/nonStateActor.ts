import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const nonStateActor = new Elysia().use(makeCRUD('nonStateActor'));
