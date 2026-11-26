<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import PersonFacts from './PersonFacts.svelte';

	/** The person's details, whose failing leaves the rest of the card standing. */
	let props: ComponentProps<typeof PersonFacts> = $props();
</script>

<div class="flex flex-1 flex-col gap-3" data-tour="team.userCard.facts">
	<svelte:boundary>
		<PersonFacts {...props} />
		{#snippet failed(_error, reset)}
			<LoadError onretry={reset} />
		{/snippet}
	</svelte:boundary>
</div>
