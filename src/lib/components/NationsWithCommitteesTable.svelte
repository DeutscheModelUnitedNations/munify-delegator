<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		committees: { abbreviation: string; name: string }[];
		children: Snippet;
	}

	let { committees, children }: Props = $props();
</script>

<table class="table">
	<thead>
		<tr>
			<th><i class="fa-duotone fa-flag"></i></th>
			{#each committees as committee}
				<th class="text-center">
					<div class="tooltip" data-tip={committee.name}>
						{committee.abbreviation}
					</div>
				</th>
			{/each}
			<th class="text-center"><i class="fa-duotone fa-users"></i></th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{@render children()}
	</tbody>
</table>
