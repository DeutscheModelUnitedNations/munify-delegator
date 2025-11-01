<script lang="ts">
	import { addToPanel } from 'svelte-inspect-value';

	interface Props {
		row: Partial<{ $selected: boolean }>;
	}

	let { row }: Props = $props();
</script>

<input type="checkbox" checked={row.$selected} class="checkbox" />
