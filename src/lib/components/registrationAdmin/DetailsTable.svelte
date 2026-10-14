<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** `DetailRow`s */
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex flex-col">
	<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
	<table class="table">
		<thead>
			<tr>
				<th></th>
				<th class="w-full"></th>
			</tr>
		</thead>
		<tbody>
			{@render children()}
		</tbody>
	</table>
</div>
