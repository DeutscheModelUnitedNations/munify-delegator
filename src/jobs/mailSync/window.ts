import dayjs from 'dayjs';
import type { UserFilter } from './mailSyncUsers';
import type { MailSyncUser } from './types';

/**
 * Which participations the mail sync still counts.
 *
 * A conference stays relevant until it ended {@link RETENTION_MONTHS} months ago; upcoming
 * conferences always count. After that its participants drop off its lists. The global lists are
 * different: they follow the user's opt-in, not a conference, so an opted-in user is loaded even
 * without any recent participation.
 */
const RETENTION_MONTHS = 10;

export function retentionCutoff(now: Date = new Date()): Date {
	return dayjs(now).subtract(RETENTION_MONTHS, 'month').toDate();
}

/** Users the sync has to look at: anyone with a global opt-in or a recent participation. */
export function mailSyncUserWhere(cutoff: Date) {
	const recent = { conference: { endConference: { gte: cutoff } } };
	return {
		OR: [
			{ wantsToReceiveGeneralInformation: true },
			{ wantsJoinTeamInformation: true },
			{ delegationMemberships: recent },
			{ singleParticipant: recent },
			{ conferenceSupervisor: recent },
			{ teamMember: recent }
		]
	} satisfies UserFilter;
}

/** The user with every participation in a conference that ended before `cutoff` left out. */
export function withinRetention({
	user,
	cutoff
}: {
	user: MailSyncUser;
	cutoff: Date;
}): MailSyncUser {
	const recent = (conference: { endConference: Date }) => conference.endConference >= cutoff;
	return {
		...user,
		delegationMemberships: user.delegationMemberships.filter((dm) =>
			recent(dm.delegation.conference)
		),
		singleParticipant: user.singleParticipant.filter((sp) => recent(sp.conference)),
		conferenceSupervisor: user.conferenceSupervisor.filter((s) => recent(s.conference)),
		teamMember: user.teamMember.filter((tm) => recent(tm.conference))
	};
}
