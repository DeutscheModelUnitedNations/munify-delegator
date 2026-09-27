<script lang="ts">
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import { queryParam } from 'sveltekit-search-params';
	import type { PageData } from './$types';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { client } from '$lib/api/rumbleClient/client';

	let { data }: { data: PageData } = $props();

	let code = queryParam('code');

	let conferenceId = $derived(data.participation?.conference?.id);

	function fetchPreview(connectionCode: string) {
		return client.query.previewConferenceSupervisor({
			__args: { conferenceId: conferenceId!, connectionCode },
			family_name: true,
			given_name: true
		});
	}

	let preview = $state<Awaited<ReturnType<typeof fetchPreview>>>();
	let previewLoading = $state(false);

	const connect = async () => {
		if (!conferenceId || !$code || !preview) return;

		const promise = client.mutate.connectToConferenceSupervisor({
			__args: { conferenceId, connectionCode: $code },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;

		await invalidateAll();
		goto(`/dashboard/${conferenceId}`);
	};

	$effect(() => {
		if (!$code || !conferenceId) return;
		previewLoading = true;
		preview = undefined;
		void fetchPreview($code)
			.then((result) => {
				preview = result;
			})
			.catch(() => {
				preview = undefined;
			})
			.finally(() => {
				previewLoading = false;
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
			class="input w-full max-w-lg font-mono tracking-[0.6rem]"
			bind:value={$code}
		/>

		{#if $code && previewLoading}
			<div class="mt-10 ml-10">
				<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
			</div>
		{:else if $code && preview}
			<div class="alert alert-info mt-4">
				<div>
					<h3 class="text-lg font-bold capitalize">
						{preview.given_name}
						{preview.family_name}
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
