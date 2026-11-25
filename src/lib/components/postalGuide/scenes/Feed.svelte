<!--
	@component
	What goes into the scanner from above: cut off at the slot, so it disappears in there; left of it nothing is cut. Put it on stage
	before `Scanner`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const clipId = $props.id();
</script>

<clipPath id={clipId}><path d="M-60 -60H460V136H268V290H-60Z" /></clipPath>
<g clip-path="url(#{clipId})">{@render children()}</g>
