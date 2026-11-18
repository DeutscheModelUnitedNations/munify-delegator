import { schemaBuilder } from '#api/rumble';
import { fetchChasePresence } from '#api/handlers/chaseLink/presenceMirror';
import { assertCanReadChasePresence } from './chasePresencePermissions';

/**
 * What the linked CHASE recorded about a conference's presence (`docs/plans/chase-link.md`), asked
 * of CHASE when called, nothing kept here. The shape of CHASE's presence export, so the attendance
 * import page scores it like an uploaded file.
 */

const Representation = schemaBuilder.simpleObject('ChasePresenceRepresentation', {
	fields: (t) => ({
		id: t.id(),
		type: t.string({ description: '`DELEGATION`, `NSA` or `UN`' }),
		alpha2Code: t.string({ nullable: true }),
		alpha3Code: t.string({ nullable: true }),
		icon: t.string({ nullable: true }),
		name: t.string({ nullable: true })
	})
});

const PresenceEvent = schemaBuilder.simpleObject('ChasePresenceEvent', {
	fields: (t) => ({
		id: t.id(),
		committeeId: t.id(),
		present: t.boolean(),
		type: t.string(),
		timestamp: t.string({ description: 'ISO 8601' })
	})
});

const Participant = schemaBuilder.simpleObject('ChasePresenceParticipant', {
	fields: (t) => ({
		email: t.string(),
		kind: t.string({ description: '`DELEGATE` or `NSA`' }),
		committeeId: t.id({ nullable: true }),
		representation: t.field({ type: Representation, nullable: true }),
		events: t.field({ type: [PresenceEvent] })
	})
});

const ChasePresence = schemaBuilder.simpleObject('ChasePresence', {
	fields: (t) => ({
		exportedAt: t.string({ description: 'When CHASE was asked, ISO 8601' }),
		conferenceId: t.id(),
		participants: t.field({ type: [Participant] })
	})
});

schemaBuilder.queryField('chasePresence', (t) =>
	t.field({
		description:
			"The linked CHASE's presence records of the conference, asked of CHASE now (participant care); null while no CHASE is linked.",
		type: ChasePresence,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, { conferenceId }, ctx) => {
			await assertCanReadChasePresence({ ctx, conferenceId });
			return fetchChasePresence({ conferenceId: String(conferenceId) });
		}
	})
);
