<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import DownloadButton from './DownloadButton.svelte';
	import { fetchConferenceStart, fetchParticipantStatusesByUser } from './participantStatuses';
	import {
		compareByName,
		nonStateActorName,
		registrationStatusColumns,
		sortableName,
		supervisorRow
	} from './exportFormatting';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const listedUser = {
		id: true,
		givenName: true,
		familyName: true,
		birthday: true
	} as const;

	/** The statuses to join against, and the conference start that decides who is of age. */
	async function fetchParticipantStatuses() {
		const [statuses, startConference] = await Promise.all([
			fetchParticipantStatusesByUser(conferenceId),
			fetchConferenceStart(conferenceId)
		]);
		return {
			get: (userId: string) => statuses.get(userId),
			// a person without a status row was never counted as of age, so this keeps that
			ofAge: (userId: string, birthday: Parameters<typeof ofAgeAtConference>[1]) =>
				ofAgeAtConference(statuses.has(userId) ? startConference : undefined, birthday)
		};
	}

	function fetchNationDelegations() {
		return client.query.delegations({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					assignedNationAlpha3Code: { isNotNull: true }
				}
			},
			id: true,
			assignedNation: { alpha3Code: true },
			members: {
				id: true,
				user: listedUser,
				assignedCommittee: { abbreviation: true }
			}
		});
	}

	function fetchNsaDelegations() {
		return client.query.delegations({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					assignedNonStateActorId: { isNotNull: true }
				}
			},
			id: true,
			assignedNonStateActor: { id: true, name: true },
			members: { id: true, user: listedUser }
		});
	}

	function fetchSingleParticipants() {
		return client.query.singleParticipants({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					assignedRoleId: { isNotNull: true }
				}
			},
			id: true,
			user: listedUser,
			assignedRole: { id: true, name: true }
		});
	}

	function fetchSupervisors() {
		return client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: listedUser,
			plansOwnAttendenceAtConference: true
		});
	}

	type ParticipantStatusData = Awaited<ReturnType<typeof fetchParticipantStatuses>>;

	/** The payment and paperwork columns, and whether the person is of age. */
	function statusColumns(
		participantStatusData: ParticipantStatusData,
		user: { id: string; birthday: Parameters<typeof ofAgeAtConference>[1] }
	) {
		return registrationStatusColumns(
			participantStatusData.get(user.id),
			participantStatusData.ofAge(user.id, user.birthday)
		);
	}

	/** The header of `participantColumns`. */
	const participantHeader = () => [
		m.familyName(),
		m.givenName(),
		m.payment(),
		m.termsAndConditions(),
		m.guardianAgreement(),
		m.mediaAgreement(),
		m.ofAge()
	];

	/** One person's row after the leading columns: name, then `statusColumns`. */
	function participantColumns(
		participantStatusData: ParticipantStatusData,
		user: {
			id: string;
			givenName: string | null;
			familyName: string | null;
			birthday: Parameters<typeof ofAgeAtConference>[1];
		}
	) {
		return [
			user.familyName ?? '',
			user.givenName ?? '',
			...statusColumns(participantStatusData, user)
		];
	}

	const getConferenceRegistrationListDelegationsData = async () => {
		const [participantStatusData, delegations] = await Promise.all([
			fetchParticipantStatuses(),
			fetchNationDelegations()
		]);

		const header = [m.country(), m.committee(), ...participantHeader()];

		const nationName = (delegation: (typeof delegations)[number]) =>
			getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation?.alpha3Code ?? '');

		const data = delegations
			.sort((a, b) => nationName(a).localeCompare(nationName(b)))
			.flatMap((delegation) =>
				delegation.members
					.sort(compareByName)
					.map((member) => [
						nationName(delegation),
						member.assignedCommittee?.abbreviation ?? '',
						...participantColumns(participantStatusData, member.user)
					])
			);

		downloadCSV(header, data, `RegistrationData_Delegation_${conferenceId}.csv`);
	};

	const getConferenceRegistrationListNSAData = async () => {
		const [participantStatusData, nsas] = await Promise.all([
			fetchParticipantStatuses(),
			fetchNsaDelegations()
		]);

		const header = [m.nonStateActor(), ...participantHeader()];

		const data = nsas
			.sort((a, b) => nonStateActorName(a).localeCompare(nonStateActorName(b)))
			.flatMap((nsa) =>
				nsa.members
					.sort(compareByName)
					.map((member) => [
						nonStateActorName(nsa),
						...participantColumns(participantStatusData, member.user)
					])
			);

		downloadCSV(header, data, `RegistrationData_NSA_${conferenceId}.csv`);
	};

	const getConferenceRegistrationListSingleParticipantData = async () => {
		const [participantStatusData, singleParticipants] = await Promise.all([
			fetchParticipantStatuses(),
			fetchSingleParticipants()
		]);

		const header = [m.role(), ...participantHeader()];

		const sortKey = (singleParticipant: (typeof singleParticipants)[number]) =>
			(singleParticipant.assignedRole?.name ?? '') + sortableName(singleParticipant.user);

		const data = singleParticipants
			.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
			.map((singleParticipant) => [
				singleParticipant.assignedRole?.name ?? '',
				...participantColumns(participantStatusData, singleParticipant.user)
			]);

		downloadCSV(header, data, `RegistrationData_SingleParticipant_${conferenceId}.csv`);
	};

	const getConferenceRegistrationListSupervisorsData = async () => {
		const [participantStatusData, supervisors] = await Promise.all([
			fetchParticipantStatuses(),
			fetchSupervisors()
		]);

		const header = [
			m.familyName(),
			m.givenName(),
			m.payment(),
			m.termsAndConditions(),
			m.mediaAgreement(),
			m.supervisorPlansOwnAttendance()
		];

		const data = supervisors
			.sort(compareByName)
			.map((supervisor) =>
				supervisorRow(supervisor, participantStatusData.get(supervisor.user.id))
			);

		downloadCSV(header, data, `RegistrationData_Supervisors_${conferenceId}.csv`);
	};
</script>

<DownloadButton onclick={getConferenceRegistrationListDelegationsData} title={m.delegations()} />
<DownloadButton onclick={getConferenceRegistrationListNSAData} title={m.nonStateActors()} />
<DownloadButton
	onclick={getConferenceRegistrationListSingleParticipantData}
	title={m.singleParticipants()}
/>
<DownloadButton onclick={getConferenceRegistrationListSupervisorsData} title={m.supervisors()} />
