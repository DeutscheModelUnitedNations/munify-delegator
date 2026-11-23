import { enum_, object, query, schemaBuilder } from '#api/rumble';
import {
	assertCanRecordPaper,
	assertCanSetAgreementDetail,
	registerAgreementDetailAbilities
} from './agreementDetailPermissions';
import {
	applyPaperReadings,
	knownReadings,
	paperReadingsSchema,
	setAgreementDetail
} from './agreementDetailService';

registerAgreementDetailAbilities();

object({ table: 'agreementDetail' });
query({ table: 'agreementDetail' });

const agreementFieldEnum = enum_({ tsName: 'agreementField' });
const agreementStateEnum = enum_({ tsName: 'agreementState' });

/** A field read off a page; `field` is any the printed codes name, known to this version or not. */
export const PaperReadingInput = schemaBuilder.inputType('PaperReadingInput', {
	fields: (t) => ({
		field: t.string({ required: true }),
		state: t.field({ type: agreementStateEnum, required: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	recordPaperReadings: t.field({
		description:
			"Takes in what the pages of a person's application documents say, as read off them (participant care): the details of what they agreed to, and the postal statuses those make. `confirm`: a person looked at it, so a choice may replace the stored one; otherwise nothing stored is taken back. A detail set by hand always stays. Answers whether a status changed. Somebody without a part in the conference answers NOT_FOUND.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			readings: t.arg({ type: [PaperReadingInput], required: true }).validate(paperReadingsSchema),
			confirm: t.arg.boolean({ required: true })
		},
		resolve: async (_root, { conferenceId, userId, readings, confirm }, ctx) => {
			const { participantId } = await assertCanRecordPaper({ ctx, conferenceId, userId });
			const { change } = await applyPaperReadings({
				participantId,
				readings: knownReadings(readings),
				confirm
			});
			return Object.keys(change).length > 0;
		}
	}),

	setAgreementDetail: t.field({
		description:
			'Sets one detail of what a person agreed to on paper by hand (participant care); scans leave it alone from then on. `null` takes it back, so scans fill it in again. The postal statuses stay as they are.',
		type: 'Boolean',
		args: {
			conferenceParticipantId: t.arg.id({ required: true }),
			field: t.arg({ type: agreementFieldEnum, required: true }),
			state: t.arg({ type: agreementStateEnum })
		},
		resolve: async (_root, { conferenceParticipantId, field, state }, ctx) => {
			await assertCanSetAgreementDetail({ ctx, conferenceParticipantId });
			await setAgreementDetail({
				participantId: conferenceParticipantId,
				field,
				state: state ?? null
			});
			return true;
		}
	})
}));
