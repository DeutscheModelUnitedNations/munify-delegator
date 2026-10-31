import { schemaBuilder } from '#api/rumble';
import { assertCanReadNametagBins, assertCanReadOwnNametagTable } from './nametagBinsPermissions';
import {
	loadNametagBinGroups,
	loadNametagBins,
	nametagConference,
	ownNametagTableIn
} from './nametagBinsService';
import { binCountSchema } from './bins';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

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

/** A bin's position in the split, from zero. */
const binIndexSchema = z
	.number()
	.int({ error: () => m.nametagBinIndexInvalid() })
	.min(0, { error: () => m.nametagBinIndexInvalid() });

schemaBuilder.queryFields((t) => ({
	nametagBins: t.field({
		description:
			"How the seated participants split into the conference's nametag bins. Computed on request: it only moves when the assignment does, and the team reads it while handing out nametags. Participant care only (FORBIDDEN otherwise).",
		type: [NametagBin],
		args: {
			conferenceId: t.arg.id({ required: true }),
			binCount: t.arg
				.int({
					description:
						"A count to preview before it is saved; left out uses the conference's setting."
				})
				.validate(binCountSchema.nullish())
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadNametagBins({ ctx, conferenceId: args.conferenceId });
			const conference = await nametagConference(args.conferenceId);

			const bins = await loadNametagBins({
				conferenceId: args.conferenceId,
				binCount: args.binCount ?? conference.nametagBinCount,
				language: conference.language
			});
			return bins.map((bin, index) => ({
				index,
				...bin,
				participants: bin.nationParticipants + bin.otherParticipants
			}));
		}
	}),

	ownNametagTable: t.field({
		description:
			'The table the caller picks up their nametag at; `null` while they hold no visible seat. The seat stays hidden until the assignment is released, like everywhere else.',
		type: OwnNametagTable,
		nullable: true,
		args: {
			conferenceId: t.arg.id({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = assertCanReadOwnNametagTable(ctx);
			return ownNametagTableIn({ conferenceId: args.conferenceId, userId: callerId });
		}
	}),

	nametagBinGroups: t.field({
		description:
			"The nations (named in the conference's language), non-state actors and roles sent to one bin, read when the team opens it. Participant care only (FORBIDDEN otherwise).",
		type: [NametagBinGroup],
		args: {
			conferenceId: t.arg.id({ required: true }),
			binCount: t.arg
				.int({ required: true, description: 'The count the bins were split into.' })
				.validate(binCountSchema),
			index: t.arg
				.int({ required: true, description: 'The bin, from zero; one past the last has none.' })
				.validate(binIndexSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadNametagBins({ ctx, conferenceId: args.conferenceId });
			const conference = await nametagConference(args.conferenceId);
			return loadNametagBinGroups({
				conferenceId: args.conferenceId,
				binCount: args.binCount,
				index: args.index,
				language: conference.language
			});
		}
	})
}));
