import { schemaBuilder } from '$api/rumble';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '$api/services/authHelper';
import {
	loadNametagBinGroups,
	loadNametagBins,
	loadOwnNametagTable
} from '$api/services/nametagBins';
import { normalizeConferenceLanguage } from '$lib/helpers/conferenceLanguage';
import { db } from '$api/db/db';
import { assertFindFirstExists } from '@m1212e/rumble';

const NametagBin = schemaBuilder.simpleObject('NametagBin', {
	description:
		'One table of the nametag handout: a run of consecutive letters of the nation names. Bins nobody is sent to have no range.',
	fields: (t) => ({
		index: t.int(),
		letters: t.stringList(),
		fromLetter: t.string({ nullable: true }),
		toLetter: t.string({ nullable: true }),
		nationParticipants: t.int(),
		otherParticipants: t.int(),
		participants: t.int()
	})
});

const NametagBinGroup = schemaBuilder.simpleObject('NametagBinGroup', {
	fields: (t) => ({
		nationAlpha3Code: t.string({ nullable: true }),
		roleName: t.string({ nullable: true }),
		sortName: t.string(),
		nationAlpha2Code: t.string({ nullable: true }),
		fontAwesomeIcon: t.string({ nullable: true }),
		participants: t.int()
	})
});

const OwnNametagTable = schemaBuilder.simpleObject('OwnNametagTable', {
	description: 'The table the caller fetches their nametag at.',
	fields: (t) => ({
		index: t.int(),
		fromLetter: t.string({ nullable: true }),
		toLetter: t.string({ nullable: true }),
		others: t.boolean()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * How the seated participants split into the conference's nametag bins. Computed on request:
	 * it only moves when the assignment does, and the team reads it while handing out nametags.
	 */
	nametagBins: t.field({
		type: [NametagBin],
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Preview a count before it is saved; defaults to the conference's setting. */
			binCount: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			const conference = await db.query.conference
				.findFirst({
					where: { id: args.conferenceId },
					columns: { nametagBinCount: true, language: true }
				})
				.then(assertFindFirstExists);

			const bins = await loadNametagBins(
				args.conferenceId,
				args.binCount ?? conference.nametagBinCount,
				normalizeConferenceLanguage(conference.language)
			);
			return bins.map((bin, index) => ({
				index,
				...bin,
				participants: bin.nationParticipants + bin.otherParticipants
			}));
		}
	}),

	/**
	 * The table the caller picks up their nametag at; `null` while they hold no visible seat. The
	 * seat stays hidden until the assignment is released, like everywhere else.
	 */
	ownNametagTable: t.field({
		type: OwnNametagTable,
		nullable: true,
		args: {
			conferenceId: t.arg.id({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.mustBeLoggedIn();
			const conference = await db.query.conference.findFirst({
				where: { id: args.conferenceId },
				columns: { nametagBinCount: true, assignmentReleased: true, language: true }
			});
			if (!conference?.assignmentReleased) return null;
			return loadOwnNametagTable(
				args.conferenceId,
				conference.nametagBinCount,
				user.sub,
				normalizeConferenceLanguage(conference.language)
			);
		}
	}),

	/** The nations (named in the conference's language), non-state actors and roles sent to one bin, read when the team opens it. */
	nametagBinGroups: t.field({
		type: [NametagBinGroup],
		args: {
			conferenceId: t.arg.id({ required: true }),
			binCount: t.arg.int({ required: true }),
			index: t.arg.int({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const conference = await db.query.conference
				.findFirst({ where: { id: args.conferenceId }, columns: { language: true } })
				.then(assertFindFirstExists);
			return loadNametagBinGroups(
				args.conferenceId,
				args.binCount,
				args.index,
				normalizeConferenceLanguage(conference.language)
			);
		}
	})
}));
