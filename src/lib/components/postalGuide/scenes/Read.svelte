<!-- Page after page is read line by line and put aside. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';

	/** The first page lies on top. */
	const PAGES = ['third', 'second', 'first'];
	/** `Sheet`'s lines of text. */
	const LINES = ['M12 40h46', 'M12 47h46', 'M12 54h30'];
</script>

<Scene>
	<g transform="translate(256 48) scale(1.3)">
		{#each PAGES as name (name)}
			<g class={name}>
				<Sheet signed={false}>
					<g class="marks">
						{#each LINES as d, index (d)}
							<!-- One offset for all lines draws them one after the other -->
							<path {d} class="mark" pathLength="1" stroke-dasharray="{LINES.length - index} 10" />
						{/each}
					</g>
				</Sheet>
			</g>
		{/each}
		<g class="glass">
			<path d="M8 8L19 19" class="handle" />
			<circle r="11" class="lens" />
		</g>
	</g>
	<Check x={352} y={56} />
</Scene>

<style>
	.mark {
		fill: none;
		stroke: var(--color-success);
		stroke-width: 2.8;
	}

	.handle {
		stroke: var(--ink);
		stroke-width: 5;
		stroke-linecap: round;
	}

	.lens {
		fill: var(--color-info);
		fill-opacity: 0.15;
		stroke: var(--ink);
		stroke-width: 2.5;
	}

	.glass {
		animation: glass var(--scene) linear infinite both;
	}

	.first .marks {
		animation: read-first var(--scene) linear infinite both;
	}

	.first {
		animation: move-first var(--scene) ease-in-out infinite both;
	}

	.second .marks {
		animation: read-second var(--scene) linear infinite both;
	}

	.second {
		animation: move-second var(--scene) ease-in-out infinite both;
	}

	.third .marks {
		animation: read-third var(--scene) linear infinite both;
	}

	@keyframes read-first {
		0%,
		5% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
		23%,
		92% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
		96.1% {
			opacity: 0;
			stroke-dashoffset: 3;
		}
		100% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
	}

	@keyframes move-first {
		0%,
		23% {
			transform: none;
		}
		29%,
		92% {
			transform: translateX(-166px);
		}
		99%,
		100% {
			transform: none;
		}
	}

	@keyframes read-second {
		0%,
		30% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
		48%,
		92% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
		96.1% {
			opacity: 0;
			stroke-dashoffset: 3;
		}
		100% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
	}

	@keyframes move-second {
		0%,
		48% {
			transform: none;
		}
		54%,
		92% {
			transform: translateX(-83px);
		}
		99%,
		100% {
			transform: none;
		}
	}

	@keyframes read-third {
		0%,
		55% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
		73%,
		92% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
		96% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
		96.1% {
			opacity: 0;
			stroke-dashoffset: 3;
		}
		100% {
			opacity: 1;
			stroke-dashoffset: 3;
		}
	}

	/* Along the lines of each page */
	@keyframes glass {
		0%,
		1% {
			opacity: 0;
			transform: translate(40px, 70px);
			animation-timing-function: ease-out;
		}
		5% {
			opacity: 1;
			transform: translate(12px, 40px);
		}
		11% {
			transform: translate(58px, 40px);
		}
		11.6% {
			transform: translate(12px, 47px);
		}
		17% {
			transform: translate(58px, 47px);
		}
		17.6% {
			transform: translate(12px, 54px);
		}
		23% {
			transform: translate(42px, 54px);
		}
		30% {
			transform: translate(12px, 40px);
		}
		36% {
			transform: translate(58px, 40px);
		}
		36.6% {
			transform: translate(12px, 47px);
		}
		42% {
			transform: translate(58px, 47px);
		}
		42.6% {
			transform: translate(12px, 54px);
		}
		48% {
			transform: translate(42px, 54px);
		}
		55% {
			transform: translate(12px, 40px);
		}
		61% {
			transform: translate(58px, 40px);
		}
		61.6% {
			transform: translate(12px, 47px);
		}
		67% {
			transform: translate(58px, 47px);
		}
		67.6% {
			transform: translate(12px, 54px);
		}
		73% {
			transform: translate(42px, 54px);
		}
		78%,
		91% {
			opacity: 1;
			transform: translate(56px, 70px);
			animation-timing-function: ease-in;
		}
		96%,
		100% {
			opacity: 0;
			transform: translate(90px, 80px);
		}
	}
</style>
