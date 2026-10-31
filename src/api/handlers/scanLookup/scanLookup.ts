import { enum_, schemaBuilder } from '#api/rumble';
import { lookupScan } from './scanLookupService';
import { assertCanLookupScan } from './scanLookupPermissions';

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

const ScanLookupResult = schemaBuilder.simpleObject('ScanLookupResult', {
	description:
		'What the entrance scanner shows of a scanned person: who they are, what they are in the conference and what is still open.',
	fields: (t) => ({
		found: t.boolean(),
		userId: t.string({ nullable: true }),
		givenName: t.string({ nullable: true }),
		familyName: t.string({ nullable: true }),
		/** The calendar day as an ISO date. */
		birthday: t.string({ nullable: true }),
		/** Whether the person has any part in the conference. */
		inConference: t.boolean(),
		isHeadDelegate: t.boolean(),
		isSupervisor: t.boolean(),
		isTeamMember: t.boolean(),
		isWaitingList: t.boolean(),
		nationAlpha2Code: t.string({ nullable: true }),
		nationAlpha3Code: t.string({ nullable: true }),
		nonStateActorName: t.string({ nullable: true }),
		nonStateActorIcon: t.string({ nullable: true }),
		committeeAbbreviation: t.string({ nullable: true }),
		singleRoleName: t.string({ nullable: true }),
		accessCardId: t.string({ nullable: true }),
		didAttend: t.boolean(),
		paymentStatus: t.field({ type: administrativeStatusEnum }),
		termsAndConditions: t.field({ type: administrativeStatusEnum }),
		guardianConsent: t.field({ type: administrativeStatusEnum }),
		/**
		 * The titles of the survey options the session expects when the person picked none of
		 * them; empty when they did, or without a session expecting any.
		 */
		missingSurveyOptions: t.stringList()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Looks a scanned code up for the entrance scanner: the code is an access card number of the
	 * conference or a user id. Any team member may use it, which the scanner is for, so it answers
	 * with this fixed set of fields instead of letting the caller read the participant's user and
	 * status rows, which only participant care may - and only for people with a part in the
	 * conference; anybody else is "not found". With a session it also tells whether the person
	 * picked one of the survey options the session expects; the titles come along, since the
	 * team members working the scanner may not read the survey itself.
	 */
	scanLookup: t.field({
		type: ScanLookupResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			code: t.arg.string({ required: true }),
			/** The scanner session the code was scanned in, whose expected survey options are checked. */
			sessionId: t.arg.id()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanLookupScan({ ctx, conferenceId: args.conferenceId });
			return lookupScan({
				conferenceId: args.conferenceId,
				code: args.code,
				sessionId: args.sessionId
			});
		}
	})
}));
