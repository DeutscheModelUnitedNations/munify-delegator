import { z } from 'zod';

/** Where the JSON schema of the file is served (`src/routes/schemata/presence`); CHASE names it. */
export const CHASE_PRESENCE_SCHEMA_URL = 'https://delegator.munify.cloud/schemata/presence';

const representationSchema = z.object({
	id: z.string(),
	alpha2Code: z.string().nullish(),
	alpha3Code: z.string().nullish(),
	faIcon: z.string().nullish(),
	type: z.enum(['DELEGATION', 'NSA', 'UN']),
	name: z.string().nullish()
});

const presenceEventSchema = z.object({
	id: z.string(),
	committeeId: z.string(),
	present: z.boolean(),
	type: z.string(),
	timestamp: z.string()
});

const participantSchema = z.object({
	email: z.string(),
	kind: z.enum(['DELEGATE', 'NSA']),
	committeeId: z.string().nullable(),
	representation: representationSchema.nullable(),
	events: z.array(presenceEventSchema)
});

/**
 * The presence export of MUNify CHASE (its `DownloadPresenceData.svelte`): every delegate and
 * non-state actor with their raw presence records. Who attended is decided on import, not in CHASE.
 */
export const chasePresenceSchema = z.object({
	$schema: z.string(),
	exportedAt: z.string(),
	conferenceId: z.string(),
	participants: z.array(participantSchema)
});

export type ChasePresence = z.infer<typeof chasePresenceSchema>;
export type ChasePresenceParticipant = ChasePresence['participants'][number];
export type ChasePresenceRepresentation = z.infer<typeof representationSchema>;
