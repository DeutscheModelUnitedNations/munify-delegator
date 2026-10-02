<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** Whether the registration has been completed, which the badge next to the notice shows. */
		applied: boolean;
	}

	let { applied }: Props = $props();
</script>

<span class="text-base-content/60 italic">{m.noAssignment()}</span>
{#if applied}
	<span class="badge badge-success badge-sm">{m.registrationCompleted()}</span>
{:else}
	<span class="badge badge-warning badge-sm">{m.registrationNotCompleted()}</span>
{/if}
