<!--
	@component
	Shakes a device on the stage (`Scanner`, the payment guide's bank) while its screen reports the
	error, at 40 to 48 % of the scene; still where nothing goes wrong.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { shakes = true, children }: { shakes?: boolean; children: Snippet } = $props();
</script>

<g class:shakes>{@render children()}</g>

<style>
	.shakes {
		transform-origin: bottom;
		animation: jam var(--scene) infinite both;
	}

	@keyframes jam {
		0%,
		40%,
		48%,
		100% {
			transform: none;
		}
		42%,
		46% {
			transform: translateX(-1.5px);
		}
		44% {
			transform: translateX(1.5px);
		}
	}
</style>
