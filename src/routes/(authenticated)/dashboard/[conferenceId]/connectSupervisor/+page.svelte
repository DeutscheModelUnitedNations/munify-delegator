<script lang="ts">
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import type { PageData } from './$types';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import toast from 'svelte-french-toast';
	import { goto, invalidateAll } from '$app/navigation';
	import { cache, graphql } from '$houdini';

	let { data }: { data: PageData } = $props();

	let code = queryParam('code');

	let conferenceId = $derived(data.conferenceQueryData?.findUniqueConference?.id);

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
		if (!conferenceId || !$code || !$previewSupervisorQuery.data?.previewConferenceSupervisor)
			return;

		const res = await toast.promise(
			connectSupervisorMutation.mutate({
				conferenceId,
				connectionCode: $code
			}),
			genericPromiseToastMessages
		);

		if (res.errors) {
			console.error(res.errors);
			return;
		}

		cache.markStale();
		await invalidateAll();
		goto(`/dashboard/${conferenceId}`);
	};
	$effect(() => {
		if ($code) {
			if (!conferenceId) {
				return;
			}
			previewSupervisorQuery.fetch({
				variables: { conferenceId, connectionCode: $code }
			});
		}
	});
</script>

<div class="flex w-full flex-col gap-4">
	<DashboardContentCard
		title={m.connectSupervisorTitle()}
		description={m.connectSupervisorDescription()}
	>
		<input
			type="text"
			class="input w-full max-w-lg font-mono tracking-[0.6rem]"
			bind:value={$code}
		/>

		{#if $code && $previewSupervisorQuery.fetching}
			<div class="mt-10 ml-10">
				<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
			</div>
		{:else if $code && $previewSupervisorQuery.data?.previewConferenceSupervisor}
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
		{:else if $code}
			<div class="alert alert-warning mt-4">{m.notFound()}</div>
		{/if}
	</DashboardContentCard>
</div>
