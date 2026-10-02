<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import { client } from '$lib/api/rumbleClient/client';
	import DashboardLinksGrid from '$lib/components/dashboard/DashboardLinksGrid.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import StatusCard from '$lib/components/statusCubes/StatusCard.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		status?: MyConferenceParticipation['participantStatus'];
		ofAgeAtConference: boolean;
	}

	let { conferenceId, status, ofAgeAtConference }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			unlockPayments: true,
			unlockPostals: true
		})
	);
	const unlockPayment = $derived(conference.unlockPayments);
	const unlockPostals = $derived(conference.unlockPostals);

	type StepStatus = ComponentProps<typeof StatusCard>['status'];

	/** A step that cannot be taken before the conference unlocks it, and is pending until it is. */
	const stepStatus = (unlocked: boolean, value: StepStatus | undefined): StepStatus =>
		unlocked ? (value ?? 'PENDING') : 'NOT_YET_POSSIBLE';

	let steps = $derived([
		{
			task: m.payment(),
			faIcon: 'hand-holding-circle-dollar',
			status: stepStatus(unlockPayment, status?.paymentStatus)
		},
		{
			task: m.userAgreement(),
			faIcon: 'file-contract',
			status: stepStatus(unlockPostals, status?.termsAndConditions)
		},
		// Only minors need their guardian's consent
		...(ofAgeAtConference
			? []
			: [
					{
						task: m.guardianAgreement(),
						faIcon: 'family',
						status: stepStatus(unlockPostals, status?.guardianConsent)
					}
				]),
		{
			task: m.mediaAgreement(),
			faIcon: 'photo-film',
			status: stepStatus(unlockPostals, status?.mediaConsent)
		}
	]);

	// NOT_YET_POSSIBLE steps don't count as done - only actually DONE ones do. The guardian's
	// consent is only a step for minors, so adults are done without it.
	let allDone = $derived(steps.every((step) => step.status === 'DONE'));
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
			{#each steps as step (step.task)}
				<StatusCard status={step.status} task={step.task} faIcon={step.faIcon} />
			{/each}
		</DashboardLinksGrid>
	{/if}
</DashboardSection>
