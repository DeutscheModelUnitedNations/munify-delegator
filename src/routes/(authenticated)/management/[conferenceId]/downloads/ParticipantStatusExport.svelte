<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type {
		AdministrativestatusEnum,
		MediaconsentstatusEnum
	} from '$lib/api/rumbleClient/client';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loading = $state(false);

	const exportUser = {
		id: true,
		email: true,
		givenName: true,
		familyName: true
	} as const;
	const supervisorNames = { user: { givenName: true, familyName: true } } as const;

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
				user: exportUser,
				assignedCommittee: { name: true },
				supervisors: supervisorNames
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
			assignedNonStateActor: { name: true },
			members: { id: true, user: exportUser, supervisors: supervisorNames }
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
			user: exportUser,
			assignedRole: { name: true },
			supervisors: supervisorNames
		});
	}

	function fetchAttendingSupervisors() {
		return client.query.conferenceSupervisors({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					plansOwnAttendenceAtConference: { eq: true }
				}
			},
			id: true,
			user: exportUser
		});
	}

	function fetchStatuses() {
		return client.query.conferenceParticipantStatuses({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: { id: true },
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true,
			paymentStatus: true,
			didAttend: true
		});
	}

	interface StatusData {
		termsAndConditions: AdministrativestatusEnum;
		guardianConsent: AdministrativestatusEnum;
		mediaConsent: AdministrativestatusEnum;
		mediaConsentStatus: MediaconsentstatusEnum;
		paymentStatus: AdministrativestatusEnum;
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

	const formatSupervisorNames = (
		supervisors: Array<{ user: { givenName: string | null; familyName: string | null } }>
	): string => {
		return supervisors
			.map((s) => `${s.user.givenName ?? ''} ${s.user.familyName ?? ''}`.trim())
			.filter((name) => name.length > 0)
			.join(', ');
	};

	// Summarize postal status from termsAndConditions, guardianConsent, mediaConsent
	// 1. PROBLEM if any are PROBLEM
	// 2. PENDING if any are PENDING (and none are PROBLEM)
	// 3. DONE otherwise
	const summarizePostalStatus = (status: StatusData): AdministrativestatusEnum => {
		const postalFields = [status.termsAndConditions, status.guardianConsent, status.mediaConsent];
		if (postalFields.some((s) => s === 'PROBLEM')) return 'PROBLEM';
		if (postalFields.some((s) => s === 'PENDING')) return 'PENDING';
		return 'DONE';
	};

	// Calculate combined postal and payment status
	// Returns one of: "Postal and Payment pending", "Only Postal pending", "Only Payment pending", "Both not pending"
	const calculateCombinedStatus = (status: StatusData): string => {
		const postalSummary = summarizePostalStatus(status);
		const postalPending = postalSummary !== 'DONE';
		const paymentPending = status.paymentStatus !== 'DONE';

		if (postalPending && paymentPending) return 'Postal and Payment pending';
		if (postalPending && !paymentPending) return 'Only Postal pending';
		if (!postalPending && paymentPending) return 'Only Payment pending';
		return 'Both not pending';
	};

	const getParticipantStatusExport = async () => {
		loading = true;
		try {
			const [nationDelegations, nsaDelegations, singleParticipants, supervisors, statuses] =
				await Promise.all([
					fetchNationDelegations(),
					fetchNsaDelegations(),
					fetchSingleParticipants(),
					fetchAttendingSupervisors(),
					fetchStatuses()
				]);

			const statusMap = new Map<string, StatusData>(
				statuses.map((s) => [
					s.user.id,
					{
						termsAndConditions: s.termsAndConditions,
						guardianConsent: s.guardianConsent,
						mediaConsent: s.mediaConsent,
						mediaConsentStatus: s.mediaConsentStatus,
						paymentStatus: s.paymentStatus,
						didAttend: s.didAttend
					}
				])
			);

			const getStatus = (userId: string): StatusData => {
				return statusMap.get(userId) ?? defaultStatus;
			};

			const rows: string[][] = [];

			// Process delegations (nation assigned)
			for (const delegation of nationDelegations) {
				const nationName = getFullTranslatedCountryNameFromISO3Code(
					delegation.assignedNation?.alpha3Code ?? ''
				);
				for (const member of delegation.members) {
					const status = getStatus(member.user.id);
					rows.push([
						member.user.id,
						member.user.email ?? '',
						member.user.givenName ?? '',
						member.user.familyName ?? '',
						'Delegation',
						nationName,
						member.assignedCommittee?.name ?? '',
						formatSupervisorNames(member.supervisors),
						status.termsAndConditions,
						status.guardianConsent,
						status.mediaConsent,
						summarizePostalStatus(status),
						status.mediaConsentStatus,
						status.paymentStatus,
						status.didAttend.toString(),
						calculateCombinedStatus(status)
					]);
				}
			}

			// Process NSAs
			for (const delegation of nsaDelegations) {
				const nsaName = delegation.assignedNonStateActor?.name ?? '';
				for (const member of delegation.members) {
					const status = getStatus(member.user.id);
					rows.push([
						member.user.id,
						member.user.email ?? '',
						member.user.givenName ?? '',
						member.user.familyName ?? '',
						'NSA',
						nsaName,
						'',
						formatSupervisorNames(member.supervisors),
						status.termsAndConditions,
						status.guardianConsent,
						status.mediaConsent,
						summarizePostalStatus(status),
						status.mediaConsentStatus,
						status.paymentStatus,
						status.didAttend.toString(),
						calculateCombinedStatus(status)
					]);
				}
			}

			// Process single participants
			for (const participant of singleParticipants) {
				const status = getStatus(participant.user.id);
				rows.push([
					participant.user.id,
					participant.user.email ?? '',
					participant.user.givenName ?? '',
					participant.user.familyName ?? '',
					'SingleParticipant',
					participant.assignedRole?.name ?? '',
					'',
					formatSupervisorNames(participant.supervisors),
					status.termsAndConditions,
					status.guardianConsent,
					status.mediaConsent,
					summarizePostalStatus(status),
					status.mediaConsentStatus,
					status.paymentStatus,
					status.didAttend.toString(),
					calculateCombinedStatus(status)
				]);
			}

			// Process supervisors
			for (const supervisor of supervisors) {
				const status = getStatus(supervisor.user.id);
				rows.push([
					supervisor.user.id,
					supervisor.user.email ?? '',
					supervisor.user.givenName ?? '',
					supervisor.user.familyName ?? '',
					'Supervisor',
					'Supervisor',
					'',
					'', // Supervisors don't have supervisors
					status.termsAndConditions,
					status.guardianConsent,
					status.mediaConsent,
					summarizePostalStatus(status),
					status.mediaConsentStatus,
					status.paymentStatus,
					status.didAttend.toString(),
					calculateCombinedStatus(status)
				]);
			}

			if (rows.length === 0) {
				console.error('No data found');
				alert(m.httpGenericError());
				return;
			}

			const header = [
				'userId',
				'email',
				'givenName',
				'familyName',
				'roleType',
				'roleName',
				'committeeAssignment',
				'supervisors',
				'termsAndConditions',
				'guardianConsent',
				'mediaConsent',
				'postalStatusSummary',
				'mediaConsentStatus',
				'paymentStatus',
				'didAttend',
				'combinedStatus'
			];

			downloadCSV(header, rows, `ParticipantStatus_${conferenceId}.csv`);
		} finally {
			loading = false;
		}
	};
</script>

<DownloadButton
	onclick={() => getParticipantStatusExport()}
	title={m.downloadParticipantStatuses()}
	{loading}
/>
