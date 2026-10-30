<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Whether a registration was sent off as an application. */
	interface Props {
		applied: boolean;
	}

	let { applied }: Props = $props();
</script>

{#if applied}
	<span class="badge badge-success badge-sm">{m.registrationCompleted()}</span>
{:else}
	<span class="badge badge-warning badge-sm">{m.registrationNotCompleted()}</span>
{/if}
