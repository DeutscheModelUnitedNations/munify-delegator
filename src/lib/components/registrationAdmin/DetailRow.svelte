<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** FontAwesome icon class labelling the row (e.g. 'fa-school') */
		icon: string;
		class?: string;
		children: Snippet;
	}

	let { icon, class: className, children }: Props = $props();
</script>

<tr>
	<td class="text-center"><i class="fa-duotone {icon} text-lg"></i></td>
	<td class={className}>
		{@render children()}
	</td>
</tr>
