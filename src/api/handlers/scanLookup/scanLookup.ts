import { enum_, schemaBuilder } from '#api/rumble';
import { lookupScan } from './scanLookupService';
import { assertCanLookupScan } from './scanLookupPermissions';
import { SCAN_ISSUES } from './scanCheck';

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

export const ScanIssueEnum = schemaBuilder.enumType('ScanIssue', {
	description: 'An open point the check finds for a scanned person, most important first.',
	values: {
		teamMember: { description: 'A team member: shown, but never scanned in.' },
		notInConference: { description: 'The person has no part in the conference as a participant.' },
		paymentOpen: { description: 'The payment is not complete.' },
		termsOpen: { description: 'The terms and conditions are not signed.' },
		guardianConsentOpen: { description: 'A minor whose guardian consent is not in.' },
		surveyOptionMissing: {
			description: 'The person picked none of the survey options the session expects.'
		},
		alreadyScanned: { description: 'The session holds a scan of the person already.' }
	} satisfies Record<(typeof SCAN_ISSUES)[number], { description: string }>
});

const ScanLookupResult = schemaBuilder.simpleObject('ScanLookupResult', {
	description:
		'What the entrance scanner shows of a scanned person: who they are, what they are in the conference and what is still open. When nothing was found, every field but `found` is empty, false or PENDING.',
	fields: (t) => ({
		found: t.boolean({
			description: 'Whether the code leads to somebody with a part in the conference.'
		}),
		userId: t.string({ nullable: true, description: "The person's user id." }),
		givenName: t.string({ nullable: true, description: "The person's given name." }),
		familyName: t.string({ nullable: true, description: "The person's family name." }),
		birthday: t.string({ description: 'The calendar day as an ISO date.', nullable: true }),
		inConference: t.boolean({
			description:
				'Whether the person takes part as a participant (delegate, single participant, supervisor or on the waiting list); not for the team.'
		}),
		isHeadDelegate: t.boolean({ description: 'Head delegate of their delegation.' }),
		isSupervisor: t.boolean({ description: 'A supervisor in the conference.' }),
		isTeamMember: t.boolean({ description: "On the conference's team." }),
		isWaitingList: t.boolean({ description: 'On the waiting list of the conference.' }),
		nationAlpha2Code: t.string({
			nullable: true,
			description: "Their delegation's nation (alpha-2)."
		}),
		nationAlpha3Code: t.string({
			nullable: true,
			description: "Their delegation's nation (alpha-3)."
		}),
		nonStateActorName: t.string({
			nullable: true,
			description: "Their delegation's non-state actor."
		}),
		nonStateActorIcon: t.string({
			nullable: true,
			description: "The non-state actor's icon (a FontAwesome name)."
		}),
		committeeAbbreviation: t.string({ nullable: true, description: 'Their committee seat.' }),
		singleRoleName: t.string({
			nullable: true,
			description: "A single participant's custom role."
		}),
		didAttend: t.boolean({ description: 'Whether their attendance has been recorded.' }),
		paymentStatus: t.field({ type: administrativeStatusEnum, description: 'Their payment.' }),
		termsAndConditions: t.field({
			type: administrativeStatusEnum,
			description: 'Their signed terms and conditions.'
		}),
		guardianConsent: t.field({
			type: administrativeStatusEnum,
			description: "Their guardian's consent; only checked for minors."
		}),
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
			'Looks a scanned code (a user id) up for the entrance scanner. Any team member may use it, which the scanner is for (FORBIDDEN for anybody else), so it answers with this fixed set of fields instead of letting the caller read the participant\'s user and status rows, which only participant care may - and only for people with a part in the conference; anybody else is "not found". With a session it also tells whether the person picked one of the survey options the session expects; the titles come along, since the team members working the scanner may not read the survey itself. The check itself is made here: `issues`, `checkPassed` and `mayRecordAnyway` are what the scanner shows and acts on.',
		type: ScanLookupResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			code: t.arg.string({ required: true, description: 'The scanned code: a user id.' }),
			sessionId: t.arg.id({
				description:
					'The scanner session the code was scanned in, whose expected survey options are checked; one of another conference is refused with INVALID_INPUT.'
			}),
			asScan: t.arg.boolean({
				description:
					'Whether the lookup is for a scan about to be recorded, which an earlier scan of the person in the session leaves open (`alreadyScanned`).'
			})
		},
		resolve: async (_root, args, ctx) => {
			await assertCanLookupScan({
				ctx,
				conferenceId: args.conferenceId,
				sessionId: args.sessionId
			});
			return lookupScan({
				conferenceId: args.conferenceId,
				code: args.code,
				sessionId: args.sessionId,
				asScan: args.asScan ?? false
			});
		}
	})
}));
