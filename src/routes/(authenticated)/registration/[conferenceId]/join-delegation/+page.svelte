<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import DelegationPreview from '$lib/components/DelegationPreview.svelte';
	import { entryCodeLength } from '$api/services/entryCodeGenerator';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';

	let { params }: PageProps = $props();

	// Invitation links carry the entry code, so the field starts filled in.
	let code = $state<string>(page.url.searchParams.get('code') ?? '');
</script>

<RegistrationStepPage
	conferenceId={params.conferenceId}
	title={m.joinDelegation()}
	description={m.pleaseCheckDelegation()}
>
	<input
		type="text"
		placeholder="Code"
		bind:value={code}
		class="input input-lg join-item mb-4 w-full max-w-xs font-mono tracking-[0.8rem] uppercase"
		oninput={(e) => {
			code = e.currentTarget.value.toUpperCase().slice(0, 6);
		}}
	/>

	{#if code && code.length === entryCodeLength}
		<DelegationPreview conferenceId={params.conferenceId} entryCode={code} />
	{/if}
</RegistrationStepPage>
