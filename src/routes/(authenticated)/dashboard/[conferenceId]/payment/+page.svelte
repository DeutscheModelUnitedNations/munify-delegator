<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { client } from '#lib/api/rumbleClient/client';
	import CoveredByOthers from './CoveredByOthers.svelte';
	import PaymentFlow from './PaymentFlow.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const currentUser = $derived(await getCurrentUser());
	const userId = $derived(currentUser.sub);
	const myStatuses = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			paymentStatus: true
		})
	);
	// Somebody who has paid makes no new references at all; the API refuses them
	const iHavePaid = $derived(myStatuses.at(0)?.paymentStatus === 'DONE');
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
	<BackToDashboard {conferenceId} />
	<h1 class="text-2xl font-bold">{m.payment()}</h1>

	{#if iHavePaid}
		<div role="status" class="alert alert-success alert-soft">
			<i aria-hidden="true" class="ph-duotone ph-check-circle text-2xl"></i>
			<div class="flex flex-col gap-1">
				<h2 class="font-bold">{m.paymentAlreadyPaidTitle()}</h2>
				<p>{m.paymentAlreadyPaidDescription()}</p>
			</div>
		</div>
	{:else}
		<svelte:boundary>
			<CoveredByOthers {conferenceId} {userId} />
			{#snippet failed()}{/snippet}
		</svelte:boundary>
		{#key conferenceId}
			<PaymentFlow {userId} {conferenceId} />
		{/key}
	{/if}
</div>
