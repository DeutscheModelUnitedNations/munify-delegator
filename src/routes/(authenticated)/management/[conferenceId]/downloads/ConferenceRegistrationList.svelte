<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { AdministrativeStatus } from '@prisma/client';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	interface Props {
		loading: boolean;
		conferenceId: string;
	}

	let { loading = $bindable(), conferenceId }: Props = $props();

	const conferenceParticipantStatusData = graphql(`
		query ConferenceParticipantStatusData($conferenceId: String!) {
			findManyConferenceParticipantStatuss(where: { conferenceId: { equals: $conferenceId } }) {
				id
				user {
					id
				}
				conference {
					startConference
				}
				paymentStatus
				termsAndConditions
				guardianConsent
				mediaConsent
			}
		}
	`);

	const conferenceRegistrationListDelegationData = graphql(`
		query ConferenceRegistrationListDelegationData($conferenceId: String!) {
			findManyDelegations(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedNationAlpha3Code: { not: { equals: null } }
				}
			) {
				id
				assignedNation {
					alpha3Code
				}
				members {
					id
					user {
						id
						given_name
						family_name
						birthday
					}
					assignedCommittee {
						abbreviation
					}
				}
			}
		}
	`);

	const conferenceRegistrationListNSAData = graphql(`
		query ConferenceRegistrationListNSAData($conferenceId: String!) {
			findManyDelegations(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedNonStateActorId: { not: { equals: null } }
				}
			) {
				id
				assignedNonStateActor {
					id
					name
				}
				members {
					id
					user {
						id
						given_name
						family_name
						birthday
					}
				}
			}
		}
	`);

	const conferenceRegistrationListSingleParticipantData = graphql(`
		query ConferenceRegistrationListSingleParticipantData($conferenceId: String!) {
			findManySingleParticipants(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedRoleId: { not: { equals: null } }
				}
			) {
				id
				user {
					id
					given_name
					family_name
					birthday
				}
				assignedRole {
					id
					name
				}
			}
		}
	`);

	const conferenceRegistrationListSupervisorsData = graphql(`
		query ConferenceRegistrationListSupervisorsData($conferenceId: String!) {
			findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
				id
				user {
					id
					given_name
					family_name
					birthday
				}
				plansOwnAttendenceAtConference
			}
		}
	`);

	const downloadCSV = (header: string[], data: string[][], filename: string) => {
		const csv = [header, ...data];
		const blob = new Blob([stringify(csv)], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const formatRegistrationStatus = (status: AdministrativeStatus | undefined) => {
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
		loading = true;
		const participantStatus = await conferenceParticipantStatusData.fetch({
			variables: { conferenceId }
		});
		const delegations = await conferenceRegistrationListDelegationData.fetch({
			variables: { conferenceId }
		});

		const participantStatusData = participantStatus.data?.findManyConferenceParticipantStatuss;
		const delegationData = delegations.data?.findManyDelegations;

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
				getFullTranslatedCountryNameFromISO3Code(a.assignedNation?.alpha3Code ?? '').localeCompare(
					getFullTranslatedCountryNameFromISO3Code(b.assignedNation?.alpha3Code ?? '')
				)
			)
			?.flatMap((delegation) => {
				const nation = getFullTranslatedCountryNameFromISO3Code(
					delegation.assignedNation?.alpha3Code ?? ''
				);
				return delegation.members
					.sort((a, b) =>
						formatNames(a.user.given_name, a.user.family_name, {
							givenNameFirst: false
						}).localeCompare(
							formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
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
							member.user.family_name ?? '',
							member.user.given_name ?? '',
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
			loading = false;
			return;
		}

		downloadCSV(header, data, `RegistrationData_Delegation_${conferenceId}.csv`);
		loading = false;
	};

	const getConferenceRegistrationListNSAData = async () => {
		loading = true;
		const participantStatus = await conferenceParticipantStatusData.fetch({
			variables: { conferenceId }
		});
		const nsas = await conferenceRegistrationListNSAData.fetch({
			variables: { conferenceId }
		});

		const participantStatusData = participantStatus.data?.findManyConferenceParticipantStatuss;
		const nsaData = nsas.data?.findManyDelegations;

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
						formatNames(a.user.given_name, a.user.family_name, {
							givenNameFirst: false
						}).localeCompare(
							formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
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
							member.user.family_name ?? '',
							member.user.given_name ?? '',
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
			loading = false;
			return;
		}

		downloadCSV(header, data, `RegistrationData_NSA_${conferenceId}.csv`);
		loading = false;
	};

	const getConferenceRegistrationListSingleParticipantData = async () => {
		loading = true;
		const participantStatus = await conferenceParticipantStatusData.fetch({
			variables: { conferenceId }
		});
		const singleParticipants = await conferenceRegistrationListSingleParticipantData.fetch({
			variables: { conferenceId }
		});

		const participantStatusData = participantStatus.data?.findManyConferenceParticipantStatuss;
		const singleParticipantData = singleParticipants.data?.findManySingleParticipants;

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
					formatNames(a.user.given_name, a.user.family_name, {
						givenNameFirst: false
					})
				).localeCompare(
					(b.assignedRole?.name ?? '') +
						formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
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
					singleParticipant.user.family_name ?? '',
					singleParticipant.user.given_name ?? '',
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
			loading = false;
			return;
		}

		downloadCSV(header, data, `RegistrationData_SingleParticipant_${conferenceId}.csv`);
		loading = false;
	};

	const getConferenceRegistrationListSupervisorsData = async () => {
		loading = true;

		const participantStatus = await conferenceParticipantStatusData.fetch({
			variables: { conferenceId }
		});
		const supervisors = await conferenceRegistrationListSupervisorsData.fetch({
			variables: { conferenceId }
		});

		const participantStatusData = participantStatus.data?.findManyConferenceParticipantStatuss;
		const supervisorData = supervisors.data?.findManyConferenceSupervisors;

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
				formatNames(a.user.given_name, a.user.family_name, {
					givenNameFirst: false
				}).localeCompare(
					formatNames(b.user.given_name, b.user.family_name, { givenNameFirst: false })
				)
			)
			?.map((supervisor) => {
				const status = participantStatusData?.find(
					(status) => status.user.id === supervisor.user.id
				);
				return [
					supervisor.user.family_name ?? '',
					supervisor.user.given_name ?? '',
					formatRegistrationStatus(status?.paymentStatus),
					formatRegistrationStatus(status?.termsAndConditions),
					formatRegistrationStatus(status?.mediaConsent),
					supervisor.plansOwnAttendenceAtConference ? 'Y' : 'N'
				];
			});

		if (!data) {
			console.error('No data found');
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		downloadCSV(header, data, `RegistrationData_Supervisors_${conferenceId}.csv`);
		loading = false;
	};
</script>

<DownloadSection title={'Tabellen für Registrierung'}>
	<DownloadElement
		btnClick={() => getConferenceRegistrationListDelegationsData()}
		title={'Delegationen'}
		bind:loading
	/>
	<DownloadElement
		btnClick={() => getConferenceRegistrationListNSAData()}
		title={'Nichtstaatliche Akteure'}
		bind:loading
	/>
	<DownloadElement
		btnClick={() => getConferenceRegistrationListSingleParticipantData()}
		title={'Einzelteilnehmer'}
		bind:loading
	/>
	<DownloadElement
		btnClick={() => getConferenceRegistrationListSupervisorsData()}
		title={'Supervisors'}
		bind:loading
	/>
</DownloadSection>
