<script lang="ts">
	import type { AdministrativeStatus } from './types';

	interface Props {
		status: AdministrativeStatus | null;
	}

	let { status }: Props = $props();
</script>

{#if status === 'DONE'}
	<i class="fa-solid fa-circle-check text-success"></i>
{:else if status === 'PENDING'}
	<i class="fa-solid fa-hourglass-half text-warning"></i>
{:else if status === 'PROBLEM'}
	<i class="fa-solid fa-triangle-exclamation fa-beat text-error"></i>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
