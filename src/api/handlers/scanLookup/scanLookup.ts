import { enum_, schemaBuilder } from '#api/rumble';
import { lookupScan } from './scanLookupService';
import { assertCanLookupScan } from './scanLookupPermissions';
import { SCAN_ISSUES } from './scanCheck';

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

export const ScanIssueEnum = schemaBuilder.enumType('ScanIssue', {
	description: 'An open point the check finds for a scanned person, most important first.',
	values: SCAN_ISSUES
});

const ScanLookupResult = schemaBuilder.simpleObject('ScanLookupResult', {
	description:
		'What the entrance scanner shows of a scanned person: who they are, what they are in the conference and what is still open.',
	fields: (t) => ({
		found: t.boolean(),
		userId: t.string({ nullable: true }),
		givenName: t.string({ nullable: true }),
		familyName: t.string({ nullable: true }),
		birthday: t.string({ description: 'The calendar day as an ISO date.', nullable: true }),
		inConference: t.boolean({ description: 'Whether the person has any part in the conference.' }),
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
		didAttend: t.boolean(),
		paymentStatus: t.field({ type: administrativeStatusEnum }),
		termsAndConditions: t.field({ type: administrativeStatusEnum }),
		guardianConsent: t.field({ type: administrativeStatusEnum }),
		missingSurveyOptions: t.stringList({
			description:
				'The titles of the survey options the session expects when the person picked none of them; empty when they did, or without a session expecting any.'
		}),
		issues: t.field({
			type: [ScanIssueEnum],
			description: 'What the check finds open for the person, most important first.'
		}),
		checkPassed: t.boolean({ description: 'Whether the check finds nothing open.' }),
		mayRecordAnyway: t.boolean({
			description:
				'Whether a scan of the person can be recorded despite the open points: never for the team, somebody outside the conference or a repeated scan.'
		})
	})
});

schemaBuilder.queryFields((t) => ({
	scanLookup: t.field({
		description:
			'Looks a scanned code up for the entrance scanner: the code is an access card number of the conference or a user id. Any team member may use it, which the scanner is for, so it answers with this fixed set of fields instead of letting the caller read the participant\'s user and status rows, which only participant care may - and only for people with a part in the conference; anybody else is "not found". With a session it also tells whether the person picked one of the survey options the session expects; the titles come along, since the team members working the scanner may not read the survey itself. The check itself is made here: `issues`, `checkPassed` and `mayRecordAnyway` are what the scanner shows and acts on.',
		type: ScanLookupResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			code: t.arg.string({ required: true }),
			/** The scanner session the code was scanned in, whose expected survey options are checked. */
			sessionId: t.arg.id(),
			/** Whether the lookup is for a scan about to be recorded, which an earlier scan of the person in the session leaves open. */
			asScan: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanLookupScan({ ctx, conferenceId: args.conferenceId });
			return lookupScan({
				conferenceId: args.conferenceId,
				code: args.code,
				sessionId: args.sessionId,
				asScan: args.asScan ?? false
			});
		}
	})
}));
