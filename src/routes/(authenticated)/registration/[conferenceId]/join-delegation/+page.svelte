<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import DelegationPreview from '$lib/components/DelegationPreview.svelte';
	import { entryCodeLength } from '$api/services/entryCodeGenerator';
	import { graphql } from '$houdini';

	let { data }: { data: PageData } = $props();

	let code = $state<string>(data.code ?? '');
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<main class="flex h-full w-full flex-1 flex-col items-center py-16 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{m.joinDelegation()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="max-ch-sm mb-10">
					{m.pleaseCheckDelegation()}
				</p>

				<input
					type="text"
					placeholder="Code"
					bind:value={code}
					class="input input-lg join-item mb-4 w-full max-w-xs font-mono tracking-[0.8rem] uppercase"
					oninput={(e: any) => {
						code = (e.target.value as string).toUpperCase().slice(0, 6);
					}}
				/>

				{#if code && code.length === entryCodeLength}
					<DelegationPreview conferenceId={data.conferenceId} entryCode={code} />
				{/if}

				<a class="btn btn-warning mt-16" href=".">{m.back()}</a>
			</div>
		</div>
	</main>
</div>
