<script lang="ts">
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import StatusCube from '$lib/components/StatusCubes/StatusCube.svelte';
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
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.personalStatus()}</h2>
	<p>{m.personalStatusDescription()}</p>
	<div class="mt-4 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		<StatusCube status="DONE" task={m.registration()} faIcon="user-plus" />
		<StatusCube
			status={unlockPayment ? (status?.paymentStatus ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
			task={m.payment()}
			faIcon="hand-holding-circle-dollar"
		/>
		<StatusCube
			status={unlockPostals ? (status?.termsAndConditions ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
			task={m.userAgreement()}
			faIcon="file-contract"
		/>
		{#if !ofAgeAtConference}
			<StatusCube
				status={unlockPostals ? (status?.guardianConsent ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
				task={m.guardianAgreement()}
				faIcon="family"
			/>
		{/if}
		<StatusCube
			status={unlockPostals ? (status?.mediaConsent ?? 'PENDING') : 'NOT_YET_POSSIBLE'}
			task={m.mediaAgreement()}
			faIcon="photo-film"
		/>
	</div>
	<div class="text-sm">
		<h4 class="font-bold">{m.statusLegend()}</h4>
		<p><i class="fas fa-hourglass-clock"></i> = {m.statusLegendNotYetPossible()}</p>
		<p><i class="fas fa-seal-exclamation"></i> = {m.statusLegendPending()}</p>
		<p><i class="fas fa-message-exclamation"></i> = {m.statusLegendProblem()}</p>
		<p><i class="fas fa-circle-check"></i> = {m.statusLegendDone()}</p>
	</div>

	{#if status?.paymentStatus !== 'DONE' || status?.termsAndConditions !== 'DONE' || (!ofAgeAtConference && status?.guardianConsent !== 'DONE') || status?.mediaConsent !== 'DONE'}
		<h3 class="text-lg font-bold">{m.takeAction()}</h3>
		{#if !unlockPayment && !unlockPostals}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-clock text-2xl"></i>
				{m.paymentAndPostalRegistrationDisabled()}
			</div>
		{:else if !unlockPayment}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-clock text-2xl"></i>
				{m.paymentDisabled()}
			</div>
		{:else if !unlockPostals}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-clock text-2xl"></i>
				{m.postalRegistrationDisabled()}
			</div>
		{/if}
		<div class="flex w-full flex-col gap-4 md:flex-row">
			{#if status?.paymentStatus !== 'DONE'}
				<a
					href="./{conferenceId}/payment"
					class="btn btn-primary btn-lg w-full md:w-auto {!unlockPayment && 'btn-disabled'}"
				>
					<i class="fas fa-hand-holding-circle-dollar"></i>
					<h4>{m.payment()}</h4>
				</a>
			{/if}
			{#if status?.termsAndConditions !== 'DONE' || (!ofAgeAtConference && status?.guardianConsent !== 'DONE') || status?.mediaConsent !== 'DONE'}
				<a
					href="./{conferenceId}/postalRegistration"
					class="btn btn-primary btn-lg w-full md:w-auto {!unlockPostals && 'btn-disabled'}"
				>
					<i class="fas fa-envelopes-bulk"></i>
					<h4>{m.postalRegistration()}</h4>
				</a>
			{/if}
		</div>
	{/if}
</section>
