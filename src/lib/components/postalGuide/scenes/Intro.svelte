<!-- A letter arrives, and the scanner reads the page in it. -->
<script lang="ts">
	import Feed from './Feed.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
</script>

<Scene>
	<g transform="translate(60 130)">
		<g class="envelope"><path d="M0 2L55 -34L110 2Z" class="back" /></g>
	</g>
	<Feed>
		<g class="page"><Sheet x={80} y={98} /></g>
	</Feed>
	<Scanner runs="faultless" />
	<g transform="translate(60 130)">
		<g class="envelope">
			<path d="M0 0L55 36L110 0V70q0 4-4 4H4q-4 0-4-4Z" class="front" />
		</g>
	</g>
</Scene>

<style>
	.back {
		fill: color-mix(in oklab, var(--color-warning) 80%, black);
	}

	.front {
		fill: var(--color-warning);
	}

	.envelope {
		animation: arrive var(--scene) ease-out infinite both;
	}

	.page {
		animation: page var(--scene) ease-in-out infinite both;
	}

	@keyframes arrive {
		0%,
		6% {
			transform: translateX(-190px);
		}
		28%,
		86% {
			transform: none;
			animation-timing-function: ease-in;
		}
		97%,
		100% {
			transform: translateX(-190px);
		}
	}

	/* Upright in front of the flap, over to the scanner, and in */
	@keyframes page {
		0%,
		6% {
			transform: translateX(-190px);
			animation-timing-function: ease-out;
		}
		28%,
		36% {
			transform: none;
		}
		50% {
			transform: translateY(-84px);
		}
		64% {
			transform: translate(209px, -84px);
		}
		80%,
		100% {
			transform: translate(209px, 40px);
		}
	}
</style>
