import { client } from './rumbleClient/client';
import { getCurrentUser } from '$lib/state/currentUser.svelte';

/** Everything the dashboard needs about one person's involvement in one conference. */
const userSummary = {
	id: true,
	givenName: true,
	familyName: true,
	pronouns: true,
	email: true,
	birthday: true
} as const;

const participantStatusSummary = {
	id: true,
	guardianConsent: true,
	mediaConsent: true,
	termsAndConditions: true,
	paymentStatus: true,
	didAttend: true,
	conference: { id: true }
} as const;

const committeeSummary = { id: true, abbreviation: true, name: true } as const;

/**
 * The dashboard's root query: who the caller is in this conference, in every role they could
 * hold, plus the conference itself.
 *
 * A person can only be one of delegation member, single participant or supervisor, but which one
 * is not known until it is looked up, so all four lookups run in parallel and the dashboard picks
 * the one that came back.
 */
export async function fetchMyConferenceParticipation({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

	const [
		user,
		participantStatus,
		conference,
		delegationMembers,
		supervisors,
		singleParticipants,
		teamMembers
	] = await Promise.all([
		client.liveQuery.user({ __args: { id: userId }, id: true, birthday: true }),
		client.query
			.conferenceParticipantStatuses({
				__args: { where: forUser },
				id: true,
				paymentStatus: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				didAttend: true
			})
			.then((rows) => rows.at(0) ?? null),
		client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			longTitle: true,
			info: true,
			showInfoExpanded: true,
			linkToPreparationGuide: true,
			linkToTeamWiki: true,
			linkToServicesPage: true,
			linkToPaperInbox: true,
			isOpenPaperSubmission: true,
			showCalendar: true,
			timezone: true,
			state: true,
			startConference: true,
			startAssignment: true,
			endConference: true,
			unlockPayments: true,
			unlockPostals: true,
			postalName: true,
			postalStreet: true,
			postalApartment: true,
			postalZip: true,
			postalCity: true,
			postalCountry: true,
			emblemDataURL: true,
			logoDataURL: true,
			committees: {
				id: true,
				abbreviation: true,
				name: true,
				numOfSeatsPerDelegation: true,
				nations: { alpha3Code: true, alpha2Code: true }
			},
			nonStateActors: {
				id: true,
				name: true,
				seatAmount: true,
				description: true,
				fontAwesomeIcon: true
			}
		}),
		client.query
			.delegationMembers({
				__args: { where: forUser },
				id: true,
				isHeadDelegate: true,
				assignedCommittee: committeeSummary,
				delegation: {
					id: true,
					entryCode: true,
					school: true,
					experience: true,
					motivation: true,
					applied: true,
					members: {
						id: true,
						isHeadDelegate: true,
						assignedCommittee: committeeSummary,
						user: {
							...userSummary,
							conferenceParticipantStatus: participantStatusSummary
						}
					},
					assignedNation: { alpha3Code: true, alpha2Code: true },
					assignedNonStateActor: {
						id: true,
						abbreviation: true,
						name: true,
						description: true,
						fontAwesomeIcon: true,
						seatAmount: true
					},
					appliedForRoles: {
						id: true,
						rank: true,
						nonStateActor: {
							id: true,
							fontAwesomeIcon: true,
							name: true,
							seatAmount: true,
							description: true
						},
						nation: { alpha3Code: true, alpha2Code: true }
					}
				},
				supervisors: {
					id: true,
					user: { givenName: true, familyName: true, pronouns: true, email: true }
				}
			})
			.then((rows) => rows.at(0) ?? null),
		client.query
			.conferenceSupervisors({
				__args: { where: forUser },
				id: true,
				plansOwnAttendenceAtConference: true,
				connectionCode: true,
				user: { id: true, familyName: true, givenName: true },
				supervisedDelegationMembers: {
					id: true,
					isHeadDelegate: true,
					assignedCommittee: committeeSummary,
					supervisors: { id: true },
					user: { ...userSummary, conferenceParticipantStatus: participantStatusSummary },
					delegation: {
						id: true,
						applied: true,
						entryCode: true,
						school: true,
						experience: true,
						motivation: true,
						appliedForRoles: {
							id: true,
							rank: true,
							nation: {
								alpha2Code: true,
								alpha3Code: true,
								committees: {
									abbreviation: true,
									name: true,
									numOfSeatsPerDelegation: true
								}
							},
							nonStateActor: {
								id: true,
								name: true,
								abbreviation: true,
								fontAwesomeIcon: true,
								seatAmount: true
							}
						},
						assignedNation: {
							alpha2Code: true,
							alpha3Code: true,
							committees: { numOfSeatsPerDelegation: true }
						},
						assignedNonStateActor: {
							id: true,
							abbreviation: true,
							name: true,
							fontAwesomeIcon: true
						},
						members: {
							id: true,
							isHeadDelegate: true,
							assignedCommittee: committeeSummary
						},
						papers: {
							id: true,
							status: true,
							type: true,
							firstSubmittedAt: true,
							author: { id: true },
							agendaItem: { id: true, title: true }
						}
					}
				},
				supervisedSingleParticipants: {
					id: true,
					school: true,
					motivation: true,
					experience: true,
					applied: true,
					supervisors: { id: true },
					user: { ...userSummary, conferenceParticipantStatus: participantStatusSummary },
					appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
					assignedRole: { id: true, name: true, fontAwesomeIcon: true }
				}
			})
			.then((rows) => rows.at(0) ?? null),
		client.query
			.singleParticipants({
				__args: { where: forUser },
				id: true,
				school: true,
				motivation: true,
				experience: true,
				applied: true,
				appliedForRoles: { id: true, name: true, description: true, fontAwesomeIcon: true },
				assignedRole: { id: true, name: true, description: true, fontAwesomeIcon: true },
				user: { id: true, givenName: true, familyName: true, pronouns: true },
				supervisors: {
					id: true,
					user: { givenName: true, familyName: true, pronouns: true, email: true }
				}
			})
			.then((rows) => rows.at(0) ?? null),
		client.query
			.teamMembers({ __args: { where: forUser }, id: true, role: true })
			.then((rows) => rows.at(0) ?? null)
	]);

	return {
		user,
		participantStatus,
		conference,
		delegationMember: delegationMembers,
		supervisor: supervisors,
		singleParticipant: singleParticipants,
		teamMember: teamMembers
	};
}

export type MyConferenceParticipation = Awaited<ReturnType<typeof fetchMyConferenceParticipation>>;

/**
 * The caller's own participation, which is what every dashboard page wants.
 *
 * Await it in a `$derived` so the page follows both the conference in the URL and the live updates
 * the mutations publish.
 */
export async function fetchMyParticipation(conferenceId: string) {
	const user = await getCurrentUser();
	return fetchMyConferenceParticipation({ userId: user.sub, conferenceId });
}
