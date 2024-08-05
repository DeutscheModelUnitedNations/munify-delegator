import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const customConferenceRole = new Elysia().use(makeCRUD('customConferenceRole'));
