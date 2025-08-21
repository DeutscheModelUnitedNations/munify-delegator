import { ofAgeAtConference } from '$lib/services/ageChecker';
import type { PrismaClient } from '@prisma/client';

export async function conferenceStats({
	db,
	conferenceId
}: {
	db: PrismaClient;
	conferenceId: string;
}) {
	const conference = await db.conference.findUniqueOrThrow({
		where: {
			id: conferenceId
		}
	});

	// Countdowns

	const now = new Date();
	const daysUntilConference = Math.floor(
		(conference.startConference.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
	);
	const daysUntilEndRegistration = Math.floor(
		(conference.startAssignment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
	);

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
			const referenceDate = conference.endConference
				? conference.endConference
				: conference.startConference
					? conference.startConference
					: new Date();
			const age = referenceDate.getTime() - u.birthday!.getTime();
			return Math.floor(age / (1000 * 60 * 60 * 24 * 365));
		});

	const averageAge =
		agesAtConference && agesAtConference.length !== 0
			? parseFloat(
					(agesAtConference.reduce((acc, age) => acc + age, 0) / agesAtConference.length).toFixed(1)
				)
			: 0;
	const ageDistribution: Record<string, number> = {};
	for (let i = 10; i <= 25; i++) {
		if (!agesAtConference.includes(i)) continue;
		ageDistribution[i.toString()] = agesAtConference.filter((age) => age === i).length;
	}

	const ageStatistics = {
		average: averageAge,
		distribution: ageDistribution
	};

	//TODO refactor this
	const diet = {
		singleParticipants: {
			omnivore: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					foodPreference: 'VEGAN'
				}
			})
		},
		delegationMembers: {
			omnivore: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					foodPreference: 'VEGAN'
				}
			})
		},
		supervisors: {
			omnivore: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					foodPreference: 'VEGAN'
				}
			})
		},
		teamMembers: {
			omnivore: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'VEGAN'
				}
			})
		}
	};

	const gender = {
		singleParticipants: {
			male: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					singleParticipant: {
						some: {
							conferenceId,
							applied: true
						}
					},
					gender: 'NO_STATEMENT'
				}
			})
		},
		delegationMembers: {
			male: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					delegationMemberships: {
						some: {
							conferenceId,
							delegation: {
								applied: true
							}
						}
					},
					gender: 'NO_STATEMENT'
				}
			})
		},
		supervisors: {
			male: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					conferenceSupervisor: {
						some: {
							conferenceId,
							plansOwnAttendenceAtConference: true
						}
					},
					gender: 'NO_STATEMENT'
				}
			})
		},
		teamMembers: {
			male: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'NO_STATEMENT'
				}
			})
		}
	};

	const conferenceStatusStats = await db.conferenceParticipantStatus.findMany({
		where: {
			conferenceId
		},
		select: {
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			didAttend: true,
			user: {
				select: {
					birthday: true
				}
			}
		}
	});

	const status = {
		paymentStatus: {
			done: conferenceStatusStats.filter((s) => s.paymentStatus === 'DONE').length,
			problem: conferenceStatusStats.filter((s) => s.paymentStatus === 'PROBLEM').length
		},
		postalStatus: {
			done: conferenceStatusStats.filter(
				(s) =>
					s.termsAndConditions === 'DONE' &&
					(ofAgeAtConference(conference.startConference, s.user.birthday) ||
						s.guardianConsent === 'DONE') &&
					s.mediaConsent === 'DONE'
			).length,
			problem: conferenceStatusStats.filter(
				(s) =>
					s.termsAndConditions === 'PROBLEM' ||
					(!ofAgeAtConference(conference.startConference, s.user.birthday) &&
						s.guardianConsent === 'PROBLEM') ||
					s.mediaConsent === 'PROBLEM'
			).length
		},
		didAttend: conferenceStatusStats.filter((s) => s.didAttend).length
	};

	return {
		countdowns,
		registrationStatistics,
		ageStatistics,
		diet,
		gender,
		status
	};
}
