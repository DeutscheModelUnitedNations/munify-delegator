<!-- Coloured, squared and used paper, and then a plain white sheet. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const GRID = [10, 20, 30, 40, 50, 60];
</script>

<Scene>
	<g transform="translate(90 84)">
		<g class="pink">
			<rect width="70" height="99" rx="2" class="pink-paper" />
			<path d="M12 26h46M12 36h34M12 46h40" class="pink-line" />
		</g>
		<g class="squared">
			<rect width="70" height="99" rx="2" class="white" />
			{#each GRID as line (line)}
				<path d="M{line} 0V99M0 {line + 2}H70M0 {line + 34}H70" class="grid" />
			{/each}
			<path d="M0 8q5 -7 5 0t0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8" class="torn" />
			<path d="M20 40h14v14H20ZM34 47l14 12M22 74q10-12 14 0t14-4" class="doodle" />
		</g>
		<g class="scrap">
			<path d="M0 0H70V72l-8 7-7-5-9 11-8-8-10 12-8-9-9 7-11-4Z" class="yellow" />
			<path d="M12 18h28M12 32h36M12 46h24" class="scribble" />
			<path d="M10 32h40" class="crossed" />
		</g>
		<g class="plain">
			<Sheet />
		</g>
	</g>
	<Scanner />
	<Strike x={125} y={130} />
	<Check x={160} y={88} />
</Scene>

<style>
	.white {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.2;
	}

	.pink-paper {
		fill: #ff8fc5;
	}

	.pink-line {
		stroke: #e1006a;
		stroke-width: 3;
		stroke-linecap: round;
	}

	.grid {
		fill: none;
		stroke: #b5cdf0;
		stroke-width: 0.8;
	}

	.torn {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 2;
	}

	.doodle,
	.scribble {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.yellow {
		fill: #ffe27a;
		stroke: #d9b945;
	}

	.crossed {
		stroke: #d22;
		stroke-width: 2.5;
	}

	.pink {
		animation: pink var(--scene) infinite both;
	}

	.squared {
		animation: squared var(--scene) infinite both;
	}

	.scrap {
		animation: scrap var(--scene) infinite both;
	}

	.plain {
		animation: plain var(--scene) infinite both;
	}

	@keyframes pink {
		0%,
		1% {
			opacity: 0;
			transform: translateY(-60px);
			animation-timing-function: ease-out;
		}
		5%,
		13% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		16%,
		100% {
			opacity: 0;
			transform: translateX(-60px);
		}
	}

	@keyframes squared {
		0%,
		15% {
			opacity: 0;
			transform: translateY(-60px);
			animation-timing-function: ease-out;
		}
		19%,
		27% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		30%,
		100% {
			opacity: 0;
			transform: translateX(-60px);
		}
	}

	@keyframes scrap {
		0%,
		29% {
			opacity: 0;
			transform: translateY(-60px);
			animation-timing-function: ease-out;
		}
		33%,
		61% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		65%,
		100% {
			opacity: 0;
			transform: translateX(-60px);
		}
	}

	@keyframes plain {
		0%,
		64% {
			opacity: 0;
			transform: translateY(-60px);
			animation-timing-function: ease-out;
		}
		72%,
		92% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		97%,
		100% {
			opacity: 0;
			transform: translateX(-60px);
		}
	}
</style>
