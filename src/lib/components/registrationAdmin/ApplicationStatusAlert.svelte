<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** Whether the registration was submitted */
		applied: boolean;
	}

	let { applied }: Props = $props();
</script>

{#if applied}
	<div class="alert alert-success">
		<i class="fas fa-check"></i>
		{m.registrationCompleted()}
	</div>
{:else}
	<div class="alert alert-warning">
		<i class="fas fa-hourglass-half"></i>
		{m.registrationNotCompleted()}
	</div>
{/if}
