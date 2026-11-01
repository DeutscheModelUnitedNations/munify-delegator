<script lang="ts">
	import { logger } from '#lib/logger';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { downloadCSV } from '#lib/utils/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
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
					assignedRole: { kind: 'NATION' }
				}
			},
			id: true,
			assignedRole: { nation: { alpha3Code: true } },
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
					assignedRole: { kind: 'NON_STATE_ACTOR' }
				}
			},
			id: true,
			assignedRole: { name: true },
			members: { id: true, user: exportUser, supervisors: supervisorNames }
		});
	}

	function fetchSingleParticipants() {
		return client.query.singleParticipants({
			__args: {
				where: {
					conference: { id: { eq: conferenceId } },
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
					conference: { id: { eq: conferenceId } },
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

			const row = ({ user, role }: { user: ExportedUser; role: RoleColumns }) =>
				exportRow({ user, role, status: statusMap.get(user.id) ?? defaultStatus });

			const rows: string[][] = [
				// Delegations (nation assigned)
				...nationDelegations.flatMap((delegation) => {
					const nationName = getFullTranslatedCountryNameFromISO3Code(
						delegation.assignedRole?.nation?.alpha3Code ?? ''
					);
					return delegation.members.map((member) =>
						row({
							user: member.user,
							role: {
								roleType: 'Delegation',
								roleName: nationName,
								committee: member.assignedCommittee?.name,
								supervisors: formatSupervisorNames(member.supervisors)
							}
						})
					);
				}),
				// NSAs
				...nsaDelegations.flatMap((delegation) =>
					delegation.members.map((member) =>
						row({
							user: member.user,
							role: {
								roleType: 'NSA',
								roleName: delegation.assignedRole?.name ?? '',
								supervisors: formatSupervisorNames(member.supervisors)
							}
						})
					)
				),
				// Single participants
				...singleParticipants.map((participant) =>
					row({
						user: participant.user,
						role: {
							roleType: 'SingleParticipant',
							roleName: participant.assignedRole?.name ?? '',
							supervisors: formatSupervisorNames(participant.supervisors)
						}
					})
				),
				// Supervisors, who have no supervisors of their own
				...supervisors.map((supervisor) =>
					row({ user: supervisor.user, role: { roleType: 'Supervisor', roleName: 'Supervisor' } })
				)
			];

			if (rows.length === 0) {
				logger.error('No data found');
				toast.error(m.httpGenericError());
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

			downloadCSV({ header, data: rows, filename: `ParticipantStatus_${conferenceId}.csv` });
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
