<!-- The fields are filled in on a computer, or on paper with a pen. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Laptop from './Laptop.svelte';
	import Pen from './Pen.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';

	const TYPED = [
		{ name: 'typed-1', d: 'M158 70h7m3 0h5m3 0h9m6 0h6m3 0h8' },
		{ name: 'typed-2', d: 'M158 94h9m3 0h6m3 0h7m3 0h5m3 0h6' },
		{ name: 'typed-3', d: 'M158 118h5m3 0h8m3 0h6m6 0h9m3 0h7' }
	];
	const WRITTEN = [
		{ name: 'written-1', d: 'M14 44l2 -5 2 5 2 -4 3 4 2 -5 3 5 2 -3 3 3 2 -4 3 4 4 -2' },
		{ name: 'written-2', d: 'M14 56l3 -4 2 4 2 -5 3 5 3 -3 2 3 3 -5 2 5 4 -2' },
		{ name: 'written-3', d: 'M13.5 65.5l4 4l0 -4l-4 4' }
	];
</script>

<Scene>
	<g transform="translate(-44 50) scale(0.75)">
		<Laptop>
			<path d="M156 79h88M156 103h88M156 127h88M176 145h56" class="field" />
			<rect x="156" y="139" width="12" height="12" rx="1" class="box" />
			<g class="filled">
				{#each TYPED as { name, d } (name)}
					<path {d} class="typed {name}" />
				{/each}
				<path d="M159 142l6 6m0 -6l-6 6" class="cross" />
			</g>
			<path d="M0 -6v12" class="caret" />
		</Laptop>
	</g>
	<g transform="translate(260 64) scale(1.3)">
		<Sheet signed={false} fields>
			<g class="filled">
				{#each WRITTEN as { name, d } (name)}
					<path {d} class="written {name}" pathLength="1" />
				{/each}
			</g>
		</Sheet>
		<g class="pen"><Pen /></g>
	</g>
	<Check x={106} y={46} />
	<Check x={305} y={46} />
</Scene>

<style>
	.field {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.box {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
	}

	.typed {
		fill: none;
		stroke: var(--ink);
		stroke-width: 7;
	}

	.cross {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.5;
		stroke-linecap: round;
		animation: cross var(--scene) infinite both;
	}

	.caret {
		stroke: var(--color-info);
		stroke-width: 2.5;
		animation: caret var(--scene) steps(6, end) infinite both;
	}

	.written {
		fill: none;
		stroke: var(--color-info);
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 1;
	}

	.pen {
		animation: pen var(--scene) linear infinite both;
	}

	.filled {
		animation: filled var(--scene) infinite both;
	}

	.typed-1 {
		animation: typed-1 var(--scene) infinite both;
	}

	.typed-2 {
		animation: typed-2 var(--scene) infinite both;
	}

	.typed-3 {
		animation: typed-3 var(--scene) infinite both;
	}

	.written-1 {
		animation: written-1 var(--scene) linear infinite both;
	}

	.written-2 {
		animation: written-2 var(--scene) linear infinite both;
	}

	.written-3 {
		animation: written-3 var(--scene) linear infinite both;
	}

	/* Emptied again for the next round */
	@keyframes filled {
		0%,
		92% {
			opacity: 1;
		}
		96%,
		96.2% {
			opacity: 0;
		}
		96.3%,
		100% {
			opacity: 1;
		}
	}

	@keyframes cross {
		0%,
		36% {
			opacity: 0;
			transform: scale(2);
		}
		38%,
		96% {
			opacity: 1;
			transform: none;
		}
		96.1%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	/* At the end of what is typed */
	@keyframes caret {
		0%,
		4% {
			transform: translate(160px, 70px);
		}
		13%,
		14.9% {
			transform: translate(210px, 70px);
		}
		15% {
			transform: translate(160px, 94px);
		}
		23%,
		24.9% {
			transform: translate(205px, 94px);
		}
		25% {
			transform: translate(160px, 118px);
		}
		33%,
		96% {
			transform: translate(207px, 118px);
		}
		96.1%,
		100% {
			transform: translate(160px, 70px);
		}
	}

	/* Follows what is written, in points of equal distance along it */
	@keyframes pen {
		0%,
		40% {
			transform: translate(56px, 66px);
			animation-timing-function: ease-in-out;
		}
		44% {
			transform: translate(14px, 44px);
		}
		45% {
			transform: translate(16px, 39px);
		}
		46% {
			transform: translate(18px, 44px);
		}
		46.9% {
			transform: translate(20px, 40px);
		}
		47.8% {
			transform: translate(23px, 44px);
		}
		48.8% {
			transform: translate(25px, 39px);
		}
		49.9% {
			transform: translate(28px, 44px);
		}
		50.6% {
			transform: translate(30px, 41px);
		}
		51.4% {
			transform: translate(33px, 44px);
		}
		52.2% {
			transform: translate(35px, 40px);
		}
		53.2% {
			transform: translate(38px, 44px);
		}
		54% {
			transform: translate(42px, 42px);
		}
		57% {
			transform: translate(14px, 56px);
		}
		58% {
			transform: translate(17px, 52px);
		}
		58.9% {
			transform: translate(19px, 56px);
		}
		60% {
			transform: translate(21px, 51px);
		}
		61.2% {
			transform: translate(24px, 56px);
		}
		62.1% {
			transform: translate(27px, 53px);
		}
		62.8% {
			transform: translate(29px, 56px);
		}
		64% {
			transform: translate(32px, 51px);
		}
		65.1% {
			transform: translate(34px, 56px);
		}
		66% {
			transform: translate(38px, 54px);
		}
		69% {
			transform: translate(13.5px, 65.5px);
		}
		70.5% {
			transform: translate(17.5px, 69.5px);
		}
		71.5% {
			transform: translate(17.5px, 65.5px);
		}
		73% {
			transform: translate(13.5px, 69.5px);
			animation-timing-function: ease-out;
		}
		77%,
		100% {
			transform: translate(56px, 66px);
		}
	}

	@keyframes typed-1 {
		0%,
		4% {
			clip-path: inset(-4px 100% -4px 0);
			animation-timing-function: steps(6, end);
		}
		13%,
		96% {
			clip-path: inset(-4px 0 -4px 0);
		}
		96.1%,
		100% {
			clip-path: inset(-4px 100% -4px 0);
		}
	}

	@keyframes typed-2 {
		0%,
		15% {
			clip-path: inset(-4px 100% -4px 0);
			animation-timing-function: steps(6, end);
		}
		23%,
		96% {
			clip-path: inset(-4px 0 -4px 0);
		}
		96.1%,
		100% {
			clip-path: inset(-4px 100% -4px 0);
		}
	}

	@keyframes typed-3 {
		0%,
		25% {
			clip-path: inset(-4px 100% -4px 0);
			animation-timing-function: steps(6, end);
		}
		33%,
		96% {
			clip-path: inset(-4px 0 -4px 0);
		}
		96.1%,
		100% {
			clip-path: inset(-4px 100% -4px 0);
		}
	}

	@keyframes written-1 {
		0%,
		44% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		44.1% {
			opacity: 1;
			stroke-dashoffset: 1;
		}
		54%,
		96% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96.1%,
		100% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
	}

	@keyframes written-2 {
		0%,
		57% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		57.1% {
			opacity: 1;
			stroke-dashoffset: 1;
		}
		66%,
		96% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96.1%,
		100% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
	}

	@keyframes written-3 {
		0%,
		69% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		69.1% {
			opacity: 1;
			stroke-dashoffset: 1;
		}
		73%,
		96% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96.1%,
		100% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
	}
</style>
