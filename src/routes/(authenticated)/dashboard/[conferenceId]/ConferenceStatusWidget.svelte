<script lang="ts">
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import DashboardLinksGrid from '$lib/components/Dashboard/DashboardLinksGrid.svelte';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import StatusCard from '$lib/components/StatusCubes/StatusCard.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		userId: string;
		status?: MyConferenceparticipationQuery$result['findUniqueConferenceParticipantStatus'];
		ofAgeAtConference: boolean;
		unlockPayment?: boolean;
		unlockPostals?: boolean;
	}

	let {
		conferenceId,
		status,
		userId,
		ofAgeAtConference,
		unlockPayment = false,
		unlockPostals = false
	}: Props = $props();

	let allDone = $derived.by(() => {
		// NOT_YET_POSSIBLE items don't count as done - only actually DONE items do
		const paymentDone = unlockPayment && status?.paymentStatus === 'DONE';
		const termsDone = unlockPostals && status?.termsAndConditions === 'DONE';
		const guardianDone = ofAgeAtConference || (unlockPostals && status?.guardianConsent === 'DONE');
		const mediaDone = unlockPostals && status?.mediaConsent === 'DONE';
		return paymentDone && termsDone && guardianDone && mediaDone;
	});
</script>

<DashboardSection
	icon="clipboard-check"
	title={m.personalStatus()}
	description={m.personalStatusDescription()}
>
	{#if allDone}
		<div class="card bg-success/10 border border-success/20">
			<div class="card-body py-4">
				<div class="flex items-center gap-3">
					<i class="fa-solid fa-circle-check text-2xl text-success"></i>
					<span class="font-medium text-success">{m.allComplete()}</span>
				</div>
			</div>
		</div>
	{:else}
		<DashboardLinksGrid>
			<StatusCard
				status="DONE"
				task={m.registration()}
				faIcon="user-plus"
				customDescription={m.statusRegistrationConfirmed()}
			/>
			<StatusCard
				status={unlockPayment ? (status?.paymentStatus ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
				task={m.payment()}
				faIcon="hand-holding-circle-dollar"
			/>
			<StatusCard
				status={unlockPostals ? (status?.termsAndConditions ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
				task={m.userAgreement()}
				faIcon="file-contract"
			/>
			{#if !ofAgeAtConference}
				<StatusCard
					status={unlockPostals ? (status?.guardianConsent ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
					task={m.guardianAgreement()}
					faIcon="family"
				/>
			{/if}
			<StatusCard
				status={unlockPostals ? (status?.mediaConsent ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
				task={m.mediaAgreement()}
				faIcon="photo-film"
			/>
		</DashboardLinksGrid>
	{/if}
</DashboardSection>
