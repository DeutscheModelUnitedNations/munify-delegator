<!-- A sheet printed on both sides, and then each page on a sheet of its own. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';
</script>

<Scene>
	<path d="M68 190a68 22 0 0 0 130 0" class="turn" />
	<path d="M190 186l9 3-2 10" class="turn" />
	<g class="second"><Sheet x={90} y={76} number={2} /></g>
	<g class="flip">
		<Sheet x={90} y={76} number={1} />
		<g class="reverse"><Sheet x={90} y={76} number={2} /></g>
	</g>
	<Scanner />
	<Strike x={125} y={125} />
	<Check x={125} y={48} />
</Scene>

<style>
	.turn {
		fill: none;
		stroke: var(--color-base-content);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: turn var(--scene) infinite both;
	}

	.flip {
		animation: flip var(--scene) ease-in-out infinite both;
	}

	.reverse {
		animation: reverse var(--scene) step-end infinite both;
	}

	.second {
		animation: second var(--scene) ease-in-out infinite both;
	}

	@keyframes turn {
		0%,
		6%,
		40%,
		100% {
			opacity: 0;
		}
		10%,
		36% {
			opacity: 0.5;
		}
	}

	/* Turned over at 13, 23 and 33 %, when the sheet is seen from its edge */
	@keyframes flip {
		0%,
		8% {
			transform: none;
		}
		13% {
			transform: scaleX(0.02) skewY(8deg);
		}
		18% {
			transform: none;
		}
		23% {
			transform: scaleX(0.02) skewY(-8deg);
		}
		28% {
			transform: none;
		}
		33% {
			transform: scaleX(0.02) skewY(8deg);
		}
		38%,
		63% {
			transform: none;
		}
		68% {
			transform: scaleX(0.02) skewY(-8deg);
		}
		73% {
			transform: none;
		}
		82%,
		91% {
			transform: translateX(-46px) rotate(-3deg);
		}
		98%,
		100% {
			transform: none;
		}
	}

	@keyframes reverse {
		0% {
			opacity: 0;
		}
		13% {
			opacity: 1;
		}
		23% {
			opacity: 0;
		}
		33% {
			opacity: 1;
		}
		68%,
		100% {
			opacity: 0;
		}
	}

	@keyframes second {
		0%,
		70% {
			opacity: 0;
			transform: none;
		}
		72% {
			opacity: 1;
			transform: none;
		}
		82%,
		91% {
			opacity: 1;
			transform: translateX(46px) rotate(3deg);
		}
		98% {
			opacity: 1;
			transform: none;
		}
		98.1%,
		100% {
			opacity: 0;
			transform: none;
		}
	}
</style>
