<!-- The payment reference as a transfer carries it, centred on `x`/`y` (baseline). -->
<script lang="ts">
	let { x, y }: { x: number; y: number } = $props();
</script>

<text {x} {y}>K7MX-3RPA-…</text>

<style>
	text {
		font-family: ui-monospace, monospace;
		font-size: 8.5px;
		font-weight: 700;
		text-anchor: middle;
		fill: var(--ink);
	}
</style>
