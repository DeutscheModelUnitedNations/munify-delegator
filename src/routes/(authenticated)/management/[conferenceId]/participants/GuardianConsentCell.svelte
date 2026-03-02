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
	<i class="fa-solid fa-circle-check text-success"></i>
{:else if status === 'PENDING'}
	<i class="fa-solid fa-hourglass-half text-warning"></i>
{:else if status === 'PROBLEM'}
	<i class="fa-solid fa-triangle-exclamation fa-beat text-error"></i>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
