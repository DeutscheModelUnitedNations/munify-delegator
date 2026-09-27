<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loadingStates = $state<Record<string, boolean>>({});

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	const listedUser = {
		id: true,
		givenName: true,
		familyName: true,
		birthday: true
	} as const;

	function fetchParticipantStatuses() {
		return client.query.conferenceParticipantStatuses({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: { id: true },
			conference: { startConference: true },
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true
		});
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

	const formatRegistrationStatus = (status: AdministrativestatusEnum | undefined) => {
		switch (status) {
			case 'DONE':
				return '';
			case 'PENDING':
				return 'X';
			case 'PROBLEM':
				return 'P';
			default:
				return 'X';
		}
	};

	const getConferenceRegistrationListDelegationsData = async () => {
		const key = 'delegations';
		setLoading(key, true);
		try {
			const [participantStatusData, delegations] = await Promise.all([
				fetchParticipantStatuses(),
				fetchNationDelegations()
			]);

			const delegationData = delegations;

			const header = [
				m.country(),
				m.committee(),
				m.familyName(),
				m.givenName(),
				m.payment(),
				m.termsAndConditions(),
				m.guardianAgreement(),
				m.mediaAgreement(),
				m.ofAge()
			];

			const data = delegationData
				?.sort((a, b) =>
					getFullTranslatedCountryNameFromISO3Code(
						a.assignedNation?.alpha3Code ?? ''
					).localeCompare(
						getFullTranslatedCountryNameFromISO3Code(b.assignedNation?.alpha3Code ?? '')
					)
				)
				?.flatMap((delegation) => {
					const nation = getFullTranslatedCountryNameFromISO3Code(
						delegation.assignedNation?.alpha3Code ?? ''
					);
					return delegation.members
						.sort((a, b) =>
							formatNames(a.user.givenName ?? undefined, a.user.familyName ?? undefined, {
								givenNameFirst: false
							}).localeCompare(
								formatNames(b.user.givenName ?? undefined, b.user.familyName ?? undefined, {
									givenNameFirst: false
								})
							)
						)
						.map((member) => {
							const status = participantStatusData?.find(
								(status) => status.user.id === member.user.id
							);
							const ofAge = ofAgeAtConference(
								status?.conference.startConference,
								member.user.birthday
							);
							return [
								nation,
								member.assignedCommittee?.abbreviation ?? '',
								member.user.familyName ?? '',
								member.user.givenName ?? '',
								formatRegistrationStatus(status?.paymentStatus),
								formatRegistrationStatus(status?.termsAndConditions),
								ofAge ? '' : formatRegistrationStatus(status?.guardianConsent),
								formatRegistrationStatus(status?.mediaConsent),
								ofAge ? 'Y' : 'N'
							];
						});
				});

			if (!data) {
				console.error('No data found');
				alert(m.httpGenericError());
				return;
			}

			downloadCSV(header, data, `RegistrationData_Delegation_${conferenceId}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getConferenceRegistrationListNSAData = async () => {
		const key = 'nsa';
		setLoading(key, true);
		try {
			const [participantStatusData, nsas] = await Promise.all([
				fetchParticipantStatuses(),
				fetchNsaDelegations()
			]);

			const nsaData = nsas;

			const header = [
				m.nonStateActor(),
				m.familyName(),
				m.givenName(),
				m.payment(),
				m.termsAndConditions(),
				m.guardianAgreement(),
				m.mediaAgreement(),
				m.ofAge()
			];

			const data = nsaData
				?.sort((a, b) =>
					(a.assignedNonStateActor?.name ?? '').localeCompare(b.assignedNonStateActor?.name ?? '')
				)
				?.flatMap((nsa) => {
					return nsa.members
						.sort((a, b) =>
							formatNames(a.user.givenName ?? undefined, a.user.familyName ?? undefined, {
								givenNameFirst: false
							}).localeCompare(
								formatNames(b.user.givenName ?? undefined, b.user.familyName ?? undefined, {
									givenNameFirst: false
								})
							)
						)
						.map((member) => {
							const status = participantStatusData?.find(
								(status) => status.user.id === member.user.id
							);
							const ofAge = ofAgeAtConference(
								status?.conference.startConference,
								member.user.birthday
							);
							return [
								nsa.assignedNonStateActor?.name ?? '',
								member.user.familyName ?? '',
								member.user.givenName ?? '',
								formatRegistrationStatus(status?.paymentStatus),
								formatRegistrationStatus(status?.termsAndConditions),
								ofAge ? '' : formatRegistrationStatus(status?.guardianConsent),
								formatRegistrationStatus(status?.mediaConsent),
								ofAge ? 'Y' : 'N'
							];
						});
				});

			if (!data) {
				console.error('No data found');
				alert(m.httpGenericError());
				return;
			}

			downloadCSV(header, data, `RegistrationData_NSA_${conferenceId}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getConferenceRegistrationListSingleParticipantData = async () => {
		const key = 'single';
		setLoading(key, true);
		try {
			const [participantStatusData, singleParticipants] = await Promise.all([
				fetchParticipantStatuses(),
				fetchSingleParticipants()
			]);

			const singleParticipantData = singleParticipants;

			const header = [
				m.role(),
				m.familyName(),
				m.givenName(),
				m.payment(),
				m.termsAndConditions(),
				m.guardianAgreement(),
				m.mediaAgreement(),
				m.ofAge()
			];

			const data = singleParticipantData
				?.sort((a, b) =>
					(
						(a.assignedRole?.name ?? '') +
						formatNames(a.user.givenName ?? undefined, a.user.familyName ?? undefined, {
							givenNameFirst: false
						})
					).localeCompare(
						(b.assignedRole?.name ?? '') +
							formatNames(b.user.givenName ?? undefined, b.user.familyName ?? undefined, {
								givenNameFirst: false
							})
					)
				)
				?.map((singleParticipant) => {
					const status = participantStatusData?.find(
						(status) => status.user.id === singleParticipant.user.id
					);
					const ofAge = ofAgeAtConference(
						status?.conference.startConference,
						singleParticipant.user.birthday
					);
					return [
						singleParticipant.assignedRole?.name ?? '',
						singleParticipant.user.familyName ?? '',
						singleParticipant.user.givenName ?? '',
						formatRegistrationStatus(status?.paymentStatus),
						formatRegistrationStatus(status?.termsAndConditions),
						ofAge ? '' : formatRegistrationStatus(status?.guardianConsent),
						formatRegistrationStatus(status?.mediaConsent),
						ofAge ? 'Y' : 'N'
					];
				});

			if (!data) {
				console.error('No data found');
				alert(m.httpGenericError());
				return;
			}

			downloadCSV(header, data, `RegistrationData_SingleParticipant_${conferenceId}.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const getConferenceRegistrationListSupervisorsData = async () => {
		const key = 'supervisors';
		setLoading(key, true);
		try {
			const [participantStatusData, supervisors] = await Promise.all([
				fetchParticipantStatuses(),
				fetchSupervisors()
			]);

			const supervisorData = supervisors;

			const header = [
				m.familyName(),
				m.givenName(),
				m.payment(),
				m.termsAndConditions(),
				m.mediaAgreement(),
				m.supervisorPlansOwnAttendance()
			];

			const data = supervisorData
				?.sort((a, b) =>
					formatNames(a.user.givenName ?? undefined, a.user.familyName ?? undefined, {
						givenNameFirst: false
					}).localeCompare(
						formatNames(b.user.givenName ?? undefined, b.user.familyName ?? undefined, {
							givenNameFirst: false
						})
					)
				)
				?.map((supervisor) => {
					const status = participantStatusData?.find(
						(status) => status.user.id === supervisor.user.id
					);
					return [
						supervisor.user.familyName ?? '',
						supervisor.user.givenName ?? '',
						formatRegistrationStatus(status?.paymentStatus),
						formatRegistrationStatus(status?.termsAndConditions),
						formatRegistrationStatus(status?.mediaConsent),
						supervisor.plansOwnAttendenceAtConference ? 'Y' : 'N'
					];
				});

			if (!data) {
				console.error('No data found');
				alert(m.httpGenericError());
				return;
			}

			downloadCSV(header, data, `RegistrationData_Supervisors_${conferenceId}.csv`);
		} finally {
			setLoading(key, false);
		}
	};
</script>

<DownloadButton
	onclick={() => getConferenceRegistrationListDelegationsData()}
	title={m.delegations()}
	loading={loadingStates['delegations'] ?? false}
/>
<DownloadButton
	onclick={() => getConferenceRegistrationListNSAData()}
	title={m.nonStateActors()}
	loading={loadingStates['nsa'] ?? false}
/>
<DownloadButton
	onclick={() => getConferenceRegistrationListSingleParticipantData()}
	title={m.singleParticipants()}
	loading={loadingStates['single'] ?? false}
/>
<DownloadButton
	onclick={() => getConferenceRegistrationListSupervisorsData()}
	title={m.supervisors()}
	loading={loadingStates['supervisors'] ?? false}
/>
