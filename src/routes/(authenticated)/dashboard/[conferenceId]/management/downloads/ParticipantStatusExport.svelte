<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import DownloadButton from './DownloadButton.svelte';
	import { fetchParticipantStatusesByUser } from './participantStatuses';
	import {
		defaultStatus,
		exportRow,
		formatSupervisorNames,
		type ExportedUser,
		type RoleColumns
	} from './participantStatusRows';

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

	const getParticipantStatusExport = async () => {
		loading = true;
		try {
			const [nationDelegations, nsaDelegations, singleParticipants, supervisors, statusMap] =
				await Promise.all([
					fetchNationDelegations(),
					fetchNsaDelegations(),
					fetchSingleParticipants(),
					fetchAttendingSupervisors(),
					fetchParticipantStatusesByUser(conferenceId)
				]);

			const row = (user: ExportedUser, role: RoleColumns) =>
				exportRow(user, role, statusMap.get(user.id) ?? defaultStatus);

			const rows: string[][] = [
				// Delegations (nation assigned)
				...nationDelegations.flatMap((delegation) => {
					const nationName = getFullTranslatedCountryNameFromISO3Code(
						delegation.assignedNation?.alpha3Code ?? ''
					);
					return delegation.members.map((member) =>
						row(member.user, {
							roleType: 'Delegation',
							roleName: nationName,
							committee: member.assignedCommittee?.name,
							supervisors: formatSupervisorNames(member.supervisors)
						})
					);
				}),
				// NSAs
				...nsaDelegations.flatMap((delegation) =>
					delegation.members.map((member) =>
						row(member.user, {
							roleType: 'NSA',
							roleName: delegation.assignedNonStateActor?.name ?? '',
							supervisors: formatSupervisorNames(member.supervisors)
						})
					)
				),
				// Single participants
				...singleParticipants.map((participant) =>
					row(participant.user, {
						roleType: 'SingleParticipant',
						roleName: participant.assignedRole?.name ?? '',
						supervisors: formatSupervisorNames(participant.supervisors)
					})
				),
				// Supervisors, who have no supervisors of their own
				...supervisors.map((supervisor) =>
					row(supervisor.user, { roleType: 'Supervisor', roleName: 'Supervisor' })
				)
			];

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
