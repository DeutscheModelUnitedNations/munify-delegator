import type { PrismaClient } from '@prisma/client';

export async function conferenceStats(db: PrismaClient, conferenceId: string) {
	const conference = await db.conference.findUniqueOrThrow({
		where: {
			id: conferenceId
		}
	});

	// Countdowns

	const now = new Date();
	const daysUntilConference = conference.start
		? Math.floor((conference.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: undefined;
	const daysUntilEndRegistration = conference.endRegistration
		? Math.floor((conference.endRegistration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: undefined;

	const countdowns = {
		daysUntilConference,
		daysUntilEndRegistration
	};

	// Registration statistics

	const delegations = await db.delegation.findMany({
		where: {
			conferenceId
		},
		select: {
			applied: true,
			_count: {
				select: {
					members: true,
					supervisors: true
				}
			}
		}
	});

	const singleParticipants = await db.singleParticipant.findMany({
		where: {
			conferenceId
		},
		select: {
			applied: true
		}
	});

	const supervisors = await db.conferenceSupervisor.findMany({
		where: {
			conferenceId
		}
	});

	const roles = await db.customConferenceRole.findMany({
		where: {
			conferenceId
		},
		select: {
			name: true,
			fontAwesomeIcon: true,
			singleParticipant: {
				select: {
					applied: true
				}
			}
		}
	});

	const delegationsApplied = delegations.filter((d) => d.applied).length;
	const delegationsNotApplied = delegations.length - delegationsApplied;
	const delegationsWithSupervisor = delegations.reduce((acc, d) => {
		if (!d._count.supervisors) return acc;
		return acc + 1;
	}, 0);
	const delegationMembersApplied = delegations.reduce((acc, d) => {
		if (!d.applied) return acc;
		return acc + d._count.members;
	}, 0);
	const delegationMembersNotApplied =
		delegations.reduce((acc, d) => acc + d._count.members, 0) - delegationMembersApplied;
	const singleParticipantsApplied = singleParticipants.filter((sp) => sp.applied).length;
	const singleParticipantsNotApplied = singleParticipants.length - singleParticipantsApplied;
	const singleParticipantsByRole = roles.map((role) => ({
		role: role.name,
		fontAwesomeIcon: role.fontAwesomeIcon || undefined,
		total: role.singleParticipant.length,
		applied: role.singleParticipant.filter((sp) => sp.applied).length,
		notApplied: role.singleParticipant.filter((sp) => !sp.applied).length
	}));
	const totalApplied = delegationMembersApplied + singleParticipantsApplied;
	const totalNotApplied =
		delegations.reduce((acc, d) => acc + d._count.members, 0) +
		singleParticipants.length -
		totalApplied;

	const registrationStatistics = {
		total: totalApplied + totalNotApplied,
		notApplied: totalNotApplied,
		applied: totalApplied,
		delegations: {
			total: delegationsNotApplied + delegationsApplied,
			notApplied: delegationsNotApplied,
			applied: delegationsApplied,
			withSupervisor: delegationsWithSupervisor
		},
		delegationMembers: {
			total: delegationMembersNotApplied + delegationMembersApplied,
			notApplied: delegationMembersNotApplied,
			applied: delegationMembersApplied
		},
		singleParticipants: {
			total: singleParticipantsNotApplied + singleParticipantsApplied,
			notApplied: singleParticipantsNotApplied,
			applied: singleParticipantsApplied,
			byRole: singleParticipantsByRole
		},
		supervisors: supervisors.length
	};

	// Age statistics

	const usersBirthdays = await db.user.findMany({
		where: {
			OR: [
				{ singleParticipant: { some: { conferenceId, applied: true } } },
				{
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					}
				}
			]
		},
		select: {
			birthday: true
		}
	});

	const agesAtConference = usersBirthdays
		.filter((u) => u.birthday)
		.map((u) => {
			const referenceDate = conference.end
				? conference.end
				: conference.start
					? conference.start
					: new Date();
			const age = referenceDate.getTime() - u.birthday!.getTime();
			return Math.floor(age / (1000 * 60 * 60 * 24 * 365));
		});

	const averageAge =
		agesAtConference && agesAtConference.length !== 0
			? parseFloat(
					(agesAtConference.reduce((acc, age) => acc + age, 0) / agesAtConference.length).toFixed(1)
				)
			: undefined;
	const ageDistribution: Record<string, number> = {};
	for (let i = 10; i <= 25; i++) {
		if (!agesAtConference.includes(i)) continue;
		ageDistribution[i.toString()] = agesAtConference.filter((age) => age === i).length;
	}

	const ageStatistics = {
		average: averageAge,
		distribution: ageDistribution
	};

	return {
		countdowns,
		registrationStatistics,
		ageStatistics
	};
}
