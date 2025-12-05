<script lang="ts">
	interface Props {
		row: Partial<{ $selected: boolean }>;
	}

	let { row }: Props = $props();
</script>

<input type="checkbox" checked={row.$selected} class="checkbox" />
