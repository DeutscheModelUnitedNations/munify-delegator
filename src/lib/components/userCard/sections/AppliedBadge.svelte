<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Whether a registration was sent off as an application. */
	interface Props {
		applied: boolean;
	}

	let { applied }: Props = $props();
</script>

{#if applied}
	<span class="text-base-content/70 text-sm">
		<i aria-hidden="true" class="ph-fill ph-check-circle text-success"></i>
		{m.registrationCompleted()}
	</span>
{:else}
	<span class="text-base-content/70 text-sm">
		<i aria-hidden="true" class="ph-fill ph-hourglass-medium text-warning"></i>
		{m.registrationNotCompleted()}
	</span>
{/if}
