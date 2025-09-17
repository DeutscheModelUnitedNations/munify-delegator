<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		committees: { abbreviation: string; name: string }[];
		includeActionCell?: boolean;
		children: Snippet;
	}

	let { committees, includeActionCell = false, children }: Props = $props();
</script>

<table class="table">
	<thead>
		<tr>
			<th><i class="fa-duotone fa-flag"></i></th>
			<th><i class="fa-duotone fa-earth"></i></th>
			{#each committees as committee}
				<th class="text-center">
					<div class="tooltip tooltip-bottom" data-tip={committee.name}>
						{committee.abbreviation}
					</div>
				</th>
			{/each}
			<th class="text-center"><i class="fa-duotone fa-users"></i></th>
			{#if includeActionCell}<th></th>{/if}
		</tr>
	</thead>
	<tbody>
		{@render children()}
	</tbody>
</table>
