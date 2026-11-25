<!--
	@component
	The stage every scene of the postal guide plays on, 400 × 230. A scene loops, `SCENE_MS` long, in
	four beats the parts share (`Scanner`, `Strike`, `Check`):

	- 0 to 40 %: somebody does what they should not,
	- 40 to 62 %: it is struck through and the scanner reports an error,
	- 62 to 92 %: the right way, and the scanner reports that all is well,
	- 92 to 100 %: back to the first picture, so nothing jumps when it starts over.

	Every part therefore animates over the whole scene (`var(--scene) infinite`), and its last picture
	is its first. It says nothing the step's text does not, so it is hidden
	from screen readers. Without motion (`prefers-reduced-motion`) it shows the right way.

	Paper is white and ink dark in every theme, so `--paper` and `--ink` are no theme colours.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SCENE_MS } from '../timing';

	let { children }: { children: Snippet } = $props();
</script>

<svg viewBox="0 0 400 230" aria-hidden="true" class="stage" style:--scene="{SCENE_MS}ms">
	<ellipse cx="200" cy="206" rx="185" ry="10" class="floor" />
	{@render children()}
</svg>

<style>
	.stage {
		--paper: #fff;
		--paper-edge: #c3c9d6;
		--ink: #1f2a44;
		display: block;
		width: 100%;
		height: auto;
		overflow: hidden;
	}

	.floor {
		fill: var(--color-base-content);
		opacity: 0.08;
	}

	/* A `transform` attribute is meant in the coordinates it is written in */
	.stage :global(:not([transform])) {
		transform-box: fill-box;
		transform-origin: center;
	}

	/* Held by the pause button (`PostalGuide`) */
	:global([data-paused='true']) .stage :global(*) {
		animation-play-state: paused;
	}

	@media (prefers-reduced-motion: reduce) {
		.stage :global(*) {
			animation-delay: calc(var(--scene) * -0.89) !important;
			animation-play-state: paused !important;
		}
	}
</style>
