import { schemaBuilder } from '#api/rumble';
import { assertCanIssueNsaCards, participantForNewCard } from './nsaCardPermissions';
import { nsaCards, reprintNsaCard } from './nsaCardService';

const NsaCard = schemaBuilder.simpleObject('NsaCard', {
	description: "A printed NSA card's contents: whose it is, and its signed code for the QR.",
	fields: (t) => ({
		conferenceParticipantId: t.id(),
		givenName: t.string(),
		familyName: t.string(),
		nsaName: t.string({ nullable: true }),
		nsaIcon: t.string({ nullable: true }),
		cardNumber: t.int(),
		code: t.string({
			description:
				'The signed card code (kind `nsaCard`); `signedCodeLink` makes it the link the QR code holds.'
		})
	})
});

schemaBuilder.mutationFields((t) => ({
	issueNsaCards: t.field({
		description:
			"The printable cards of the conference's NSA delegates, all of them or those of the given participant rows (participant care). A mutation so no cache hands back old codes; signing writes nothing, so a card comes out the same until its number is raised.",
		type: [NsaCard],
		args: {
			conferenceId: t.arg.id({ required: true }),
			conferenceParticipantIds: t.arg.idList()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanIssueNsaCards({ ctx, conferenceId: args.conferenceId });
			return nsaCards({
				conferenceId: args.conferenceId,
				conferenceParticipantIds: args.conferenceParticipantIds?.map(String)
			});
		}
	}),

	reprintNsaCard: t.field({
		description:
			"A new card for a lost one: raises the person's card number, so the earlier cards stop scanning, and answers the new card (participant care).",
		type: NsaCard,
		args: { conferenceParticipantId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const participant = await participantForNewCard({
				ctx,
				conferenceParticipantId: String(args.conferenceParticipantId)
			});
			return reprintNsaCard({
				conferenceId: participant.conferenceId,
				conferenceParticipantId: participant.id
			});
		}
	})
}));
