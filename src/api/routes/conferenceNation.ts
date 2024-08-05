import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const conferenceNation = new Elysia().use(makeCRUD('conferenceNation'));
