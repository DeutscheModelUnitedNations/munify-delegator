import { db } from '../db';

// The `where` slot also accepts drizzle's EmptyFilter symbol; only the object half is useful here.
type UserFilter = Extract<
	NonNullable<NonNullable<Parameters<typeof db.query.user.findMany>[0]>['where']>,
	object
>;

// Only the fields computeSubscriberState() needs. Loading whole conferences instead would pull
// their data-URL images and legal documents along, which cost ~5-13 MB per user.

const conferenceColumns = {
	columns: { id: true, title: true, state: true, assignmentReleased: true }
} as const;

const mailSyncUserQuery = {
	columns: {
		id: true,
		email: true,
		givenName: true,
		familyName: true,
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true
	},
	with: {
		delegationMemberships: {
			columns: { isHeadDelegate: true },
			with: {
				delegation: {
					columns: { applied: true, assignedRoleId: true },
					with: { conference: conferenceColumns, assignedRole: { columns: { kind: true } } }
				}
			}
		},
		singleParticipant: {
			columns: { applied: true, assignedRoleId: true },
			with: { conference: conferenceColumns }
		},
		conferenceSupervisor: {
			columns: {},
			with: {
				conference: conferenceColumns,
				supervisedDelegationMembers: {
					columns: {},
					with: {
						delegation: { columns: { applied: true, assignedRoleId: true } }
					}
				},
				supervisedSingleParticipants: { columns: { applied: true, assignedRoleId: true } }
			}
		},
		teamMember: {
			columns: { conferenceId: true, role: true },
			with: { conference: conferenceColumns }
		}
	}
} as const;

/** One page of the users the mail sync cares about, ordered so the cursor below is stable. */
export function findMailSyncUsers(args: { where: UserFilter; limit: number }) {
	return db.query.user.findMany({
		...mailSyncUserQuery,
		where: args.where,
		orderBy: { id: 'asc' },
		limit: args.limit
	});
}

export type MailSyncUser = Awaited<ReturnType<typeof findMailSyncUsers>>[number];
