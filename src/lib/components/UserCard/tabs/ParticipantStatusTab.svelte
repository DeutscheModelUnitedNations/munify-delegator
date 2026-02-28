<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import {
		type UpdateConferenceParticipantStatusInput,
		type MediaConsentStatus$options
	} from '$houdini';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import BooleanStatusWidget from '$lib/components/BooleanStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import AccessCardSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AccessCardSection.svelte';
	import AttendanceSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AttendanceSection.svelte';
	import ImpersonationButton from '../../../../routes/(authenticated)/management/[conferenceId]/participants/ImpersonationButton.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import { certificateQuery } from '$lib/queries/certificateQuery';
	import { getBaseDocumentsForPostal } from '$lib/queries/getBaseDocuments';
	import formatNames from '$lib/services/formatNames';

	type AdministrativeStatus = 'DONE' | 'PENDING' | 'PROBLEM';

	interface Props {
		status:
			| {
					id: string;
					paymentStatus?: string | null;
					termsAndConditions?: string | null;
					guardianConsent?: string | null;
					mediaConsent?: string | null;
					mediaConsentStatus?: MediaConsentStatus$options | null;
					didAttend?: boolean | null;
					assignedDocumentNumber?: number | null;
					accessCardId?: string | null;
					attendanceEntries?: {
						id: string;
						timestamp: Date;
						occasion: string;
						recordedBy: { id: string; given_name: string; family_name: string };
					}[];
			  }
			| null
			| undefined;
		userId: string;
		conferenceId: string;
		conference:
			| {
					id: string;
					startConference?: string | null;
					endConference?: string | null;
					title?: string | null;
			  }
			| null
			| undefined;
		user: { id: string; given_name: string; family_name: string } | null | undefined;
		isDelegationMember: boolean;
		isSingleParticipant: boolean;
		isConferenceSupervisor: boolean;
		onUpdate?: () => void;
	}

	let {
		status,
		userId,
		conferenceId,
		conference,
		user,
		isDelegationMember,
		isSingleParticipant,
		isConferenceSupervisor,
		onUpdate
	}: Props = $props();

	let assignSupervisorModalOpen = $state(false);

	const changeAdministrativeStatus = async (input: UpdateConferenceParticipantStatusInput) => {
		if (!status?.id) return;
		const promise = changeParticipantStatus.mutate({
			where: { id: status.id, conferenceId, userId },
			data: input
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		cache.markStale();
		await invalidateAll();
		onUpdate?.();
	};

	const deleteParticipantMutation = graphql(`
		mutation UserCardDeleteParticipant($conferenceId: ID!, $userId: ID!) {
			unregisterParticipant(conferenceId: $conferenceId, userId: $userId) {
				id
			}
		}
	`);

	const deleteParticipant = async () => {
		const c = confirm(m.deleteParticipantConfirm());
		if (!c) return;
		try {
			await deleteParticipantMutation.mutate({ conferenceId, userId });
			cache.markStale();
			await invalidateAll();
			onUpdate?.();
		} catch {
			toast.error(m.httpGenericError());
		}
	};

	const supervisorListQuery = graphql(`
		query UserCardSupervisorList($conferenceId: String!) {
			findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
				id
				connectionCode
				user {
					id
					given_name
					family_name
				}
			}
		}
	`);

	const assignSupervisorMutation = graphql(`
		mutation UserCardAssignSupervisor($conferenceId: ID!, $userId: ID, $connectionCode: String!) {
			connectToConferenceSupervisor(
				conferenceId: $conferenceId
				userId: $userId
				connectionCode: $connectionCode
			) {
				id
			}
		}
	`);

	const assignSupervisor = async (connectionCode: string) => {
		const promise = assignSupervisorMutation.mutate({
			conferenceId,
			userId,
			connectionCode
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		assignSupervisorModalOpen = false;
		cache.markStale();
		await invalidateAll();
		onUpdate?.();
	};

	$effect(() => {
		if (assignSupervisorModalOpen) {
			supervisorListQuery.fetch({ variables: { conferenceId } });
		}
	});

	const downloadPostalDocs = async () => {
		try {
			const result = await getBaseDocumentsForPostal.fetch({
				variables: { visitorId: userId, conferenceId }
			});
			if (result.data?.postalRegistrationPDF) {
				const a = document.createElement('a');
				a.href = `data:application/pdf;base64,${result.data.postalRegistrationPDF}`;
				a.download = `postal-registration-${userId}.pdf`;
				a.click();
			}
		} catch {
			toast.error(m.httpGenericError());
		}
	};

	const downloadCertificate = async () => {
		try {
			const result = await certificateQuery.fetch({
				variables: { visitorId: userId, conferenceId }
			});
			if (result.data?.certificate) {
				const a = document.createElement('a');
				a.href = `data:application/pdf;base64,${result.data.certificate}`;
				a.download = `certificate-${userId}.pdf`;
				a.click();
			} else {
				toast.error(m.certificateDownloadError());
			}
		} catch {
			toast.error(m.certificateDownloadError());
		}
	};
</script>

<div class="flex flex-col gap-6">
	{#if status}
		<div class="flex flex-col gap-3">
			<h3 class="text-lg font-bold">{m.adminUserCardStatus()}</h3>
			<ParticipantStatusWidget
				title={m.payment()}
				faIcon="money-bill"
				status={(status?.paymentStatus ?? 'PENDING') as AdministrativeStatus}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ paymentStatus: newStatus })}
			/>
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
				onSave={async (number?: number) =>
					await changeAdministrativeStatus({
						assignedDocumentNumber: number,
						assignNextDocumentNumber: !number
					})}
				disabledShortcut
			/>
			<ParticipantStatusWidget
				title={m.userAgreement()}
				faIcon="file-signature"
				status={(status?.termsAndConditions ?? 'PENDING') as AdministrativeStatus}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ termsAndConditions: newStatus })}
			/>
			{#if !isConferenceSupervisor}
				<ParticipantStatusWidget
					title={m.guardianAgreement()}
					faIcon="shield-halved"
					status={(status?.guardianConsent ?? 'PENDING') as AdministrativeStatus}
					changeStatus={async (newStatus) =>
						await changeAdministrativeStatus({ guardianConsent: newStatus })}
				/>
			{/if}
			<ParticipantStatusWidget
				title={m.mediaAgreement()}
				faIcon="camera"
				status={(status?.mediaConsent ?? 'PENDING') as AdministrativeStatus}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ mediaConsent: newStatus })}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={status?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaConsentStatus$options) =>
					await changeAdministrativeStatus({ mediaConsentStatus: newStatus })}
			/>
			<BooleanStatusWidget
				title={m.attendance()}
				faIcon="calendar-check"
				status={status?.didAttend ?? false}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ didAttend: newStatus })}
			/>
		</div>
	{/if}

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.accessAndAttendance()}</h3>
		<AccessCardSection
			accessCardId={status?.accessCardId}
			onSave={async (value) => await changeAdministrativeStatus({ accessCardId: value })}
		/>
		<AttendanceSection
			{userId}
			{conferenceId}
			entries={status?.attendanceEntries ?? []}
			onChanged={() => {
				cache.markStale();
				invalidateAll();
				onUpdate?.();
			}}
		/>
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.adminActions()}</h3>
		<div class="flex flex-wrap gap-2">
			{#if isDelegationMember || isSingleParticipant}
				<button class="btn btn-sm" onclick={() => (assignSupervisorModalOpen = true)}>
					<i class="fa-duotone fa-chalkboard-user"></i>
					{m.assignSupervisor()}
				</button>
			{/if}

			<button class="btn btn-sm" onclick={downloadPostalDocs}>
				<i class="fa-duotone fa-file-pdf"></i>
				{m.postalRegistration()}
			</button>

			<button class="btn btn-sm" onclick={downloadCertificate}>
				<i class="fa-duotone fa-certificate"></i>
				{m.certificate()}
			</button>

			<ImpersonationButton {userId} />

			{#if user}
				{@const badgeUrl = `/api/badge?conferenceId=${conferenceId}&userId=${userId}`}
				<a
					href={badgeUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-sm"
					onclick={async (e) => {
						e.preventDefault();
						try {
							const response = await fetch(badgeUrl);
							if (!response.ok) {
								toast.error(m.genericToastError());
								return;
							}
							const blob = await response.blob();
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `badge-${formatNames(user?.given_name, user?.family_name)}.pdf`;
							a.click();
							URL.revokeObjectURL(url);
						} catch {
							toast.error(m.genericToastError());
						}
					}}
				>
					<i class="fa-duotone fa-id-badge"></i>
					{m.generateBadge()}
				</a>
			{/if}
		</div>
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-bold">{m.dangerZone()}</h3>
		<button class="btn btn-error btn-sm self-start" onclick={deleteParticipant}>
			{m.deleteParticipant()}
		</button>
	</div>
</div>

<Modal bind:open={assignSupervisorModalOpen} title={m.assignSupervisor()}>
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th></th>
					<th>{m.name()}</th>
				</tr>
			</thead>
			<tbody>
				{#if $supervisorListQuery.fetching}
					<tr>
						<td colspan="2">
							<div class="skeleton h-8 w-full"></div>
						</td>
					</tr>
				{:else if $supervisorListQuery.data?.findManyConferenceSupervisors && $supervisorListQuery.data.findManyConferenceSupervisors.length !== 0}
					{#each $supervisorListQuery.data.findManyConferenceSupervisors.sort( (a, b) => `${a.user.family_name}${a.user.given_name}`.localeCompare(`${b.user.family_name}${b.user.given_name}`) ) as supervisor (supervisor.id)}
						<tr>
							<td>
								<button
									class="btn btn-sm"
									aria-label={m.assignSupervisor()}
									onclick={() => assignSupervisor(supervisor.connectionCode)}
								>
									<i class="fa-duotone fa-plus"></i>
								</button>
							</td>
							<td>
								<span class="capitalize">{supervisor.user.given_name}</span>
								<span class="uppercase">{supervisor.user.family_name}</span>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="2" class="text-center">
							{m.noSingleParticipantsFound()}
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</Modal>
