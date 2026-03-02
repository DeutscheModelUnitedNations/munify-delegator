<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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
		<i class="fa-solid fa-circle-minus"></i>
		<span class="text-xs">{m.notRequired()}</span>
	</span>
{:else if status === 'DONE'}
	<span class="flex items-center gap-1.5 text-success">
		<i class="fa-solid fa-circle-check"></i>
		<span class="text-xs">{m.statusDone()}</span>
	</span>
{:else if status === 'PENDING'}
	<span class="flex items-center gap-1.5 text-warning">
		<i class="fa-solid fa-hourglass-half"></i>
		<span class="text-xs">{m.statusPending()}</span>
	</span>
{:else if status === 'PROBLEM'}
	<span class="flex items-center gap-1.5 text-error">
		<i class="fa-solid fa-triangle-exclamation fa-beat"></i>
		<span class="text-xs">{m.statusProblem()}</span>
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
