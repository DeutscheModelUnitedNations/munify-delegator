<!-- Stapled pages jam in the scanner; loose ones do not. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Feed from './Feed.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const PAGES = ['third', 'second', 'first'];
</script>

<Scene>
	<Feed>
		<g class="pile">
			{#each PAGES as page, index (page)}
				<g class={page}><Sheet x={98 - index * 4} y={74 + index * 4} /></g>
			{/each}
			<g class="staple">
				<path d="M96 100l14 -14" class="wire wire-shade" />
				<path d="M95 98l14 -14" class="wire" />
			</g>
		</g>
	</Feed>
	<Scanner />
	<g transform="translate(58 18)">
		<g class="stapler">
			<rect y="44" width="96" height="10" rx="5" class="base" />
			<g class="jaw">
				<path d="M2 34q0-16 18-16h62q14 0 14 14v6H2Z" class="top" />
				<rect x="6" y="36" width="86" height="6" rx="2" class="rail" />
			</g>
			<circle cx="86" cy="40" r="5" class="rail" />
		</g>
	</g>
	<Strike x={324} y={96} size={0.85} />
	<Check x={160} y={60} />
</Scene>

<style>
	.wire {
		fill: none;
		stroke: #9aa4b8;
		stroke-width: 4;
		stroke-linecap: round;
	}

	.wire-shade {
		stroke: var(--ink);
		opacity: 0.35;
	}

	.base,
	.rail {
		fill: #8a93a8;
	}

	.top {
		fill: var(--color-error);
	}

	.stapler {
		animation: stapler var(--scene) infinite both;
	}

	.jaw {
		transform-origin: right bottom;
		animation: jaw var(--scene) infinite both;
	}

	.pile {
		transform-box: view-box;
		transform-origin: 130px 130px;
		animation: pile var(--scene) ease-in-out infinite both;
	}

	.staple {
		animation: staple var(--scene) infinite both;
	}

	.first {
		animation: first var(--scene) ease-in-out infinite both;
	}

	.third {
		animation: third var(--scene) ease-in-out infinite both;
	}

	@keyframes stapler {
		0% {
			opacity: 1;
			transform: translate(-40px, -120px) rotate(-20deg);
			animation-timing-function: ease-out;
		}
		9%,
		17% {
			transform: translate(0, 10px);
		}
		24% {
			opacity: 1;
			transform: translate(-30px, -110px) rotate(-16deg);
		}
		25%,
		100% {
			opacity: 0;
			transform: translate(-30px, -110px);
		}
	}

	@keyframes jaw {
		0%,
		11% {
			transform: rotate(14deg);
		}
		13%,
		15% {
			transform: rotate(-2deg);
		}
		18%,
		100% {
			transform: rotate(14deg);
		}
	}

	@keyframes staple {
		0%,
		13% {
			opacity: 0;
			transform: none;
		}
		14%,
		66% {
			opacity: 1;
			transform: none;
		}
		71% {
			opacity: 1;
			transform: translate(-40px, -70px) rotate(240deg);
		}
		78%,
		100% {
			opacity: 0;
			transform: translate(-90px, 120px) rotate(620deg);
		}
	}

	@keyframes pile {
		0%,
		12% {
			transform: none;
		}
		14% {
			transform: scale(1.04, 0.95);
		}
		16%,
		24% {
			transform: none;
		}
		32% {
			transform: translate(190px, -66px);
		}
		39%,
		46%,
		54% {
			transform: translate(190px, -24px) rotate(-3deg);
		}
		42%,
		50%,
		58% {
			transform: translate(190px, -22px) rotate(4deg);
		}
		61% {
			transform: translate(190px, -24px);
		}
		67%,
		100% {
			transform: none;
		}
	}

	@keyframes first {
		0%,
		70% {
			transform: none;
		}
		78%,
		91% {
			transform: translate(-58px, 2px) rotate(-4deg);
		}
		98%,
		100% {
			transform: none;
		}
	}

	@keyframes third {
		0%,
		70% {
			transform: none;
		}
		78%,
		91% {
			transform: translate(62px, 6px) rotate(5deg);
		}
		98%,
		100% {
			transform: none;
		}
	}
</style>
