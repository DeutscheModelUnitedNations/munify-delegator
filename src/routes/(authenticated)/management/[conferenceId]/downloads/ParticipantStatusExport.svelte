<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { AdministrativeStatus, MediaConsentStatus } from '@prisma/client';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	interface Props {
		loading: boolean;
		conferenceId: string;
	}

	let { loading = $bindable(), conferenceId }: Props = $props();

	const participantStatusExportDelegationsQuery = graphql(`
		query ParticipantStatusExportDelegations($conferenceId: String!) {
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
						email
					}
					assignedCommittee {
						name
					}
				}
			}
		}
	`);

	const participantStatusExportNSAsQuery = graphql(`
		query ParticipantStatusExportNSAs($conferenceId: String!) {
			findManyDelegations(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedNonStateActorId: { not: { equals: null } }
				}
			) {
				id
				assignedNonStateActor {
					name
				}
				members {
					id
					user {
						id
						email
					}
				}
			}
		}
	`);

	const participantStatusExportSingleParticipantsQuery = graphql(`
		query ParticipantStatusExportSingleParticipants($conferenceId: String!) {
			findManySingleParticipants(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedRoleId: { not: { equals: null } }
				}
			) {
				id
				user {
					id
					email
				}
				assignedRole {
					name
				}
			}
		}
	`);

	const participantStatusExportSupervisorsQuery = graphql(`
		query ParticipantStatusExportSupervisors($conferenceId: String!) {
			findManyConferenceSupervisors(
				where: {
					conferenceId: { equals: $conferenceId }
					plansOwnAttendenceAtConference: { equals: true }
				}
			) {
				id
				user {
					id
					email
				}
			}
		}
	`);

	const participantStatusExportStatusesQuery = graphql(`
		query ParticipantStatusExportStatuses($conferenceId: String!) {
			findManyConferenceParticipantStatuss(where: { conferenceId: { equals: $conferenceId } }) {
				id
				user {
					id
				}
				termsAndConditions
				guardianConsent
				mediaConsent
				mediaConsentStatus
				paymentStatus
				didAttend
			}
		}
	`);

	interface StatusData {
		termsAndConditions: AdministrativeStatus;
		guardianConsent: AdministrativeStatus;
		mediaConsent: AdministrativeStatus;
		mediaConsentStatus: MediaConsentStatus;
		paymentStatus: AdministrativeStatus;
		didAttend: boolean;
	}

	const defaultStatus: StatusData = {
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		mediaConsentStatus: 'NOT_SET',
		paymentStatus: 'PENDING',
		didAttend: false
	};

	const downloadCSV = (header: string[], data: string[][], filename: string) => {
		const csv = [header, ...data];
		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const getParticipantStatusExport = async () => {
		loading = true;

		const [delegationsRes, nsasRes, singleParticipantsRes, supervisorsRes, statusesRes] =
			await Promise.all([
				participantStatusExportDelegationsQuery.fetch({ variables: { conferenceId } }),
				participantStatusExportNSAsQuery.fetch({ variables: { conferenceId } }),
				participantStatusExportSingleParticipantsQuery.fetch({ variables: { conferenceId } }),
				participantStatusExportSupervisorsQuery.fetch({ variables: { conferenceId } }),
				participantStatusExportStatusesQuery.fetch({ variables: { conferenceId } })
			]);

		const statusMap = new Map<string, StatusData>(
			statusesRes.data?.findManyConferenceParticipantStatuss.map((s) => [
				s.user.id,
				{
					termsAndConditions: s.termsAndConditions,
					guardianConsent: s.guardianConsent,
					mediaConsent: s.mediaConsent,
					mediaConsentStatus: s.mediaConsentStatus,
					paymentStatus: s.paymentStatus,
					didAttend: s.didAttend
				}
			]) ?? []
		);

		const getStatus = (userId: string): StatusData => {
			return statusMap.get(userId) ?? defaultStatus;
		};

		const rows: string[][] = [];

		// Process delegations (nation assigned)
		for (const delegation of delegationsRes.data?.findManyDelegations ?? []) {
			const nationName = getFullTranslatedCountryNameFromISO3Code(
				delegation.assignedNation?.alpha3Code ?? ''
			);
			for (const member of delegation.members) {
				const status = getStatus(member.user.id);
				rows.push([
					member.user.id,
					member.user.email ?? '',
					'Delegation',
					nationName,
					member.assignedCommittee?.name ?? '',
					status.termsAndConditions,
					status.guardianConsent,
					status.mediaConsent,
					status.mediaConsentStatus,
					status.paymentStatus,
					status.didAttend.toString()
				]);
			}
		}

		// Process NSAs
		for (const delegation of nsasRes.data?.findManyDelegations ?? []) {
			const nsaName = delegation.assignedNonStateActor?.name ?? '';
			for (const member of delegation.members) {
				const status = getStatus(member.user.id);
				rows.push([
					member.user.id,
					member.user.email ?? '',
					'NSA',
					nsaName,
					'',
					status.termsAndConditions,
					status.guardianConsent,
					status.mediaConsent,
					status.mediaConsentStatus,
					status.paymentStatus,
					status.didAttend.toString()
				]);
			}
		}

		// Process single participants
		for (const participant of singleParticipantsRes.data?.findManySingleParticipants ?? []) {
			const status = getStatus(participant.user.id);
			rows.push([
				participant.user.id,
				participant.user.email ?? '',
				'SingleParticipant',
				participant.assignedRole?.name ?? '',
				'',
				status.termsAndConditions,
				status.guardianConsent,
				status.mediaConsent,
				status.mediaConsentStatus,
				status.paymentStatus,
				status.didAttend.toString()
			]);
		}

		// Process supervisors
		for (const supervisor of supervisorsRes.data?.findManyConferenceSupervisors ?? []) {
			const status = getStatus(supervisor.user.id);
			rows.push([
				supervisor.user.id,
				supervisor.user.email ?? '',
				'Supervisor',
				'Supervisor',
				'',
				status.termsAndConditions,
				status.guardianConsent,
				status.mediaConsent,
				status.mediaConsentStatus,
				status.paymentStatus,
				status.didAttend.toString()
			]);
		}

		if (rows.length === 0) {
			console.error('No data found');
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		const header = [
			'userId',
			'email',
			'roleType',
			'roleName',
			'committeeAssignment',
			'termsAndConditions',
			'guardianConsent',
			'mediaConsent',
			'mediaConsentStatus',
			'paymentStatus',
			'didAttend'
		];

		downloadCSV(header, rows, `ParticipantStatus_${conferenceId}.csv`);
		loading = false;
	};
</script>

<DownloadSection title={m.participantStatusExport()}>
	<DownloadElement
		btnClick={() => getParticipantStatusExport()}
		title={m.downloadParticipantStatuses()}
		bind:loading
	/>
</DownloadSection>
