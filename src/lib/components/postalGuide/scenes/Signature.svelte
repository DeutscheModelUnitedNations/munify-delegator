<!-- A signature dragged into the document on a computer, and then one written on paper with a pen. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Laptop from './Laptop.svelte';
	import Pen from './Pen.svelte';
	import Scene from './Scene.svelte';
	import Sheet, { SIGNATURE } from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const HANDLES = [
		[-5, -8],
		[35, -8],
		[-5, 8],
		[35, 8]
	];
</script>

<Scene>
	<g class="computer">
		<Laptop>
			<path d="M156 66h88M156 80h88M156 94h56M156 142h80" class="line" />
			<g class="pasted">
				<g transform="translate(160 132) scale(1.7)">
					<rect x="-5" y="-8" width="40" height="16" class="selection" />
					{#each HANDLES as [x, y] (`${x},${y}`)}
						<rect x={x - 1.5} y={y - 1.5} width="3" height="3" class="handle" />
					{/each}
					<g transform="translate(-14 -76)"><path d={SIGNATURE} class="signature" /></g>
				</g>
				<path d="M218 138v22l5 -5 4 9 5 -2 -4 -9h7Z" class="cursor" />
			</g>
		</Laptop>
	</g>
	<g transform="translate(144 32) scale(1.6)">
		<g class="printed">
			<Sheet signed={false}>
				<path d={SIGNATURE} class="signature written" pathLength="1" />
			</Sheet>
		</g>
		<g class="pen"><Pen /></g>
	</g>
	<Strike x={200} y={114} />
	<Check x={118} y={112} />
</Scene>

<style>
	.line {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 4;
		stroke-linecap: round;
	}

	.selection {
		fill: var(--color-info);
		fill-opacity: 0.12;
		stroke: var(--color-info);
		stroke-width: 0.8;
		stroke-dasharray: 2.5 1.5;
	}

	.handle {
		fill: var(--paper);
		stroke: var(--color-info);
		stroke-width: 0.8;
	}

	.cursor {
		fill: var(--ink);
		stroke: var(--paper);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	.signature {
		fill: none;
		stroke: var(--color-info);
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.computer {
		animation: computer var(--scene) infinite both;
	}

	.printed {
		animation: printed var(--scene) infinite both;
	}

	.pasted {
		animation: pasted var(--scene) infinite both;
	}

	.written {
		stroke-dasharray: 1;
		animation: written var(--scene) linear infinite both;
	}

	.pen {
		animation: pen var(--scene) linear infinite both;
	}

	@keyframes computer {
		0%,
		61% {
			transform: none;
			animation-timing-function: ease-in;
		}
		65%,
		94% {
			transform: translateX(-340px);
			animation-timing-function: ease-out;
		}
		99%,
		100% {
			transform: none;
		}
	}

	@keyframes printed {
		0%,
		63% {
			opacity: 0;
			transform: translateY(-60px);
			animation-timing-function: ease-out;
		}
		67%,
		91% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		95%,
		100% {
			opacity: 0;
			transform: translateX(60px);
		}
	}

	@keyframes pasted {
		0%,
		5% {
			opacity: 0;
			transform: translate(90px, -90px);
		}
		9%,
		13% {
			opacity: 1;
			transform: translate(60px, -70px);
			animation-timing-function: ease-in-out;
		}
		30%,
		65% {
			opacity: 1;
			transform: none;
		}
		66%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	@keyframes written {
		0%,
		71% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		71.1% {
			opacity: 1;
			stroke-dashoffset: 1;
		}
		83%,
		100% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
	}

	/* Follows the signature while it is written, in points of equal distance along it */
	@keyframes pen {
		0%,
		66% {
			opacity: 0;
			transform: translate(50px, 40px);
			animation-timing-function: ease-out;
		}
		68% {
			opacity: 1;
		}
		71% {
			transform: translate(14px, 80px);
		}
		72% {
			transform: translate(15.7px, 76.2px);
		}
		73% {
			transform: translate(17.9px, 72.7px);
		}
		74% {
			transform: translate(19.9px, 75px);
		}
		75% {
			transform: translate(20.1px, 79.2px);
		}
		76% {
			transform: translate(22.4px, 77.9px);
		}
		77% {
			transform: translate(24.5px, 74.4px);
		}
		78% {
			transform: translate(27.8px, 72.8px);
		}
		79% {
			transform: translate(30.1px, 76.3px);
		}
		80% {
			transform: translate(33.2px, 75px);
		}
		81% {
			transform: translate(36.2px, 72.2px);
		}
		82% {
			transform: translate(40px, 73.7px);
		}
		83% {
			transform: translate(44px, 74px);
			animation-timing-function: ease-out;
		}
		86%,
		91% {
			opacity: 1;
			transform: translate(56px, 66px);
			animation-timing-function: ease-in;
		}
		95%,
		100% {
			opacity: 0;
			transform: translate(116px, 66px);
		}
	}
</style>
