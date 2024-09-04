<script lang="ts">
	interface Props {
		tableAttrs: any;
		tableSize: 'xs' | 'sm' | 'md' | 'lg';
		zebra: boolean;
		children: any;
	}

	let { tableAttrs, tableSize, zebra, children }: Props = $props();
</script>

<table {...tableAttrs} class="table {zebra && 'table-zebra'} table-{tableSize} table-pin-rows">
	{@render children()}
</table>
