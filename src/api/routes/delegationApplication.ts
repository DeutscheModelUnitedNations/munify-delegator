import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const delegationApplication = new Elysia().use(makeCRUD('delegationApplication'));