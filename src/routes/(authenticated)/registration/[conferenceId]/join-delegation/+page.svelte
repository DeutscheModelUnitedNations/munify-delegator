<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import DelegationPreview from '$lib/components/DelegationPreview.svelte';
	import { entryCodeLength } from '$api/services/delegationEntryCodeGenerator';
	import { graphql } from '$houdini';

	const memberMutation = graphql(`
		mutation CreateDelegationMemberMutation($entryCode: String!) {
			createOneDelegationMember(entryCode: $entryCode) {
				id
			}
		}
	`);

	let { data }: { data: PageData } = $props();

	let code = $state<string>(data.code ?? '');
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<main class="flex h-full w-full flex-1 flex-col items-center py-16 text-center">
		<h1 class="mb-3 text-3xl uppercase tracking-wider">{m.joinDelegation()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="mb-10 max-ch-sm">
					{m.pleaseCheckDelegation()}
				</p>

				{#if code && code.length === entryCodeLength}
					<DelegationPreview conferenceId={data.conferenceId} entryCode={code} />
					<button
						class="btn btn-primary mb-10"
						onclick={async () => {
							await memberMutation.mutate({ entryCode: code });
							goto('/dashboard');
						}}>{m.confirm()}</button
					>
				{/if}
				<input
					type="text"
					placeholder="Code"
					bind:value={code}
					class="input input-lg join-item input-bordered w-full max-w-xs font-mono uppercase tracking-[0.8rem]"
					oninput={(e: any) => {
						code = (e.target.value as string).toUpperCase().slice(0, 6);
					}}
				/>

				<a class="btn btn-warning mt-16" href=".">{m.back()}</a>
			</div>
		</div>
	</main>
</div>
