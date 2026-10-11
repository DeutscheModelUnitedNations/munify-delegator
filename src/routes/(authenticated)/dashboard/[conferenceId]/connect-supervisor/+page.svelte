<script lang="ts">
	import { resolve } from '$app/paths';
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import { queryParameters } from 'sveltekit-search-params';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { client } from '$lib/api/rumbleClient/client';
	import { entryCodeLength } from '$api/services/entryCodeGenerator';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const params = queryParameters({ code: true });

	let conferenceId = $derived(routeParams.conferenceId);

	// Codes are uppercase only; normalize what people type or paste (a link included).
	let normalizedCode = $derived((params.code ?? '').trim().toUpperCase());
	let codeComplete = $derived(normalizedCode.length === entryCodeLength);

	function fetchPreview(connectionCode: string) {
		return client.query.previewConferenceSupervisor({
			__args: { conferenceId, connectionCode },
			family_name: true,
			given_name: true
		});
	}

	let preview = $state<Awaited<ReturnType<typeof fetchPreview>>>();
	let previewLoading = $state(false);

	const connect = async () => {
		if (!conferenceId || !codeComplete || !preview) return;

		const promise = client.mutate.connectToConferenceSupervisor({
			__args: { conferenceId, connectionCode: normalizedCode },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;

		goto(resolve(`/dashboard/${conferenceId}`));
	};

	$effect(() => {
		if (!conferenceId || !codeComplete) return;
		previewLoading = true;
		preview = undefined;
		void fetchPreview(normalizedCode)
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
			class="input w-full max-w-lg font-mono tracking-[0.6rem] uppercase"
			bind:value={params.code}
		/>

		{#if !codeComplete}
			<!-- wait until the full code has been entered -->
		{:else if previewLoading}
			<div class="mt-10 ml-10">
				<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin text-3xl"></i>
			</div>
		{:else if preview}
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
		{:else}
			<div class="alert alert-warning mt-4">{m.notFound()}</div>
		{/if}
	</DashboardContentCard>
</div>
