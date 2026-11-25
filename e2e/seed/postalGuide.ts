/**
 * Fixtures for the postal guide (e2e/dashboard/postal-guide.spec.ts).
 *
 * A conference of its own with the postal registration unlocked, and Penny, an adult single
 * participant with a seat. Every run resets her to the first step, with the hints never watched.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const POSTAL_GUIDE = {
	conferenceId: 'e2e00000conference0000pgd',
	roleId: 'e2e00000pgdrole0000000001',
	singleParticipantId: 'e2e00000pgdsingle00000001',
	pennyId: 'e2e-pgd-penny'
} as const;

export async function seedPostalGuide(db: NodePgDatabase) {
	const { conferenceId, roleId, singleParticipantId, pennyId } = POSTAL_GUIDE;
	await upsertConference(db, {
		id: conferenceId,
		title: 'E2E Postal Guide Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await db
		.update(schema.conference)
		.set({ unlockPostals: true })
		.where(eq(schema.conference.id, conferenceId));
	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: pennyId,
			givenName: 'Penny',
			familyName: 'Post',
			birthday: new Date('1992-04-01'),
			postalGuideCompletedAt: null
		}
	]);

	const role = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: roleId,
		name: 'E2E Postal Guide Role'
	};
	await db
		.insert(schema.conferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: role });

	const participantId = await upsertParticipant(db, conferenceId, pennyId);
	await db
		.update(schema.conferenceParticipant)
		.set({ postalInfoRead: false, postalConfirmedDetails: null, postalConfirmedOfAge: null })
		.where(eq(schema.conferenceParticipant.id, participantId));
	const single = {
		...makeSeedSingleParticipant({
			conferenceParticipantId: participantId,
			applied: true
		}),
		id: singleParticipantId,
		assignedRoleId: roleId
	};
	await db
		.insert(schema.singleParticipant)
		.values(single)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });
}
