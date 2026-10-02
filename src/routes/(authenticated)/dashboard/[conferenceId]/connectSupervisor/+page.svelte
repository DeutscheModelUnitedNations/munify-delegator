<script lang="ts">
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import type { PageData } from './$types';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { cache, graphql } from '$houdini';
	import { entryCodeLength } from '$api/services/entryCodeGenerator';

	let { data }: { data: PageData } = $props();

	let code = queryParam('code');

	let conferenceId = $derived(data.conferenceQueryData?.findUniqueConference?.id);

	// codes are uppercase only; normalize what users type or paste (incl. via link)
	let normalizedCode = $derived(($code ?? '').trim().toUpperCase());
	let codeComplete = $derived(normalizedCode.length === entryCodeLength);

	const previewSupervisorQuery = graphql(`
		query previewSupervisor($conferenceId: ID!, $connectionCode: String!) {
			previewConferenceSupervisor(conferenceId: $conferenceId, connectionCode: $connectionCode) {
				family_name
				given_name
			}
		}
	`);

	const connectSupervisorMutation = graphql(`
		mutation connectSupervisor($conferenceId: ID!, $connectionCode: String!) {
			connectToConferenceSupervisor(conferenceId: $conferenceId, connectionCode: $connectionCode) {
				id
			}
		}
	`);

	const connect = async () => {
		if (
			!conferenceId ||
			!codeComplete ||
			!$previewSupervisorQuery.data?.previewConferenceSupervisor
		)
			return;

		const promise = connectSupervisorMutation.mutate({
			conferenceId,
			connectionCode: normalizedCode
		});
		toast.promise(promise, genericPromiseToastMessages);

		const res = await promise;

		if (res?.errors) {
			console.error(res.errors);
			return;
		}

		cache.markStale();
		await invalidateAll();
		goto(`/dashboard/${conferenceId}`);
	};
	$effect(() => {
		if (!conferenceId || !codeComplete) return;
		previewSupervisorQuery.fetch({
			variables: { conferenceId, connectionCode: normalizedCode }
		});
	});
</script>

<div class="flex w-full flex-col gap-4">
	<DashboardContentCard
		title={m.connectSupervisorTitle()}
		description={m.connectSupervisorDescription()}
	>
		<input
			type="text"
			class="input w-full max-w-lg font-mono tracking-[0.6rem] uppercase"
			bind:value={$code}
		/>

		{#if !codeComplete}
			<!-- wait until the full code has been entered -->
		{:else if $previewSupervisorQuery.fetching}
			<div class="mt-10 ml-10">
				<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
			</div>
		{:else if $previewSupervisorQuery.data?.previewConferenceSupervisor}
			<div class="alert alert-info mt-4">
				<div>
					<h3 class="text-lg font-bold capitalize">
						{$previewSupervisorQuery.data.previewConferenceSupervisor.given_name}
						{$previewSupervisorQuery.data.previewConferenceSupervisor.family_name}
					</h3>
					<p class="mt-4 text-sm">{m.connectSupervisorWarning()}</p>
					<button class="btn btn-primary mt-4" onclick={connect}>{m.connectSupervisorBtn()}</button>
				</div>
			</div>
		{:else}
			<div class="alert alert-warning mt-4">{m.notFound()}</div>
		{/if}
	</DashboardContentCard>
</div>
