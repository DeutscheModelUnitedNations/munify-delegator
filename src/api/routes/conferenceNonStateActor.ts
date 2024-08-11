import Elysia, { t } from 'elysia';
import { makeCRUD } from '$api/util/crudmaker';

export const conferenceNonStateActor = new Elysia().use(
	// makeCRUD('conferenceNonStateActor', { getAll: false })
	makeCRUD('conferenceNonStateActor')
);
