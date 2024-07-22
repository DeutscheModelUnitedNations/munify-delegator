import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const conference = new Elysia().use(makeCRUD('conference'));
