<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import StatusIcon from './StatusIcon.svelte';
	import type { AdministrativeStatus } from './types';

	interface Props {
		status: AdministrativeStatus | null;
		ageAtConference: number | null;
	}

	let { status, ageAtConference }: Props = $props();

	const isOfAge = $derived(ageAtConference != null && ageAtConference >= 18);
</script>

{#if isOfAge}
	<span class="flex items-center gap-1.5 text-base-content/40">
		<i class="fa-sharp-duotone fa-solid fa-circle-minus"></i>
		<span class="text-xs">{m.notRequired()}</span>
	</span>
{:else}
	<StatusIcon {status} />
{/if}
