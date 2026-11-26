<!--
	@component
	The document scanner at the right of the stage. Its display is idle, then shows an error, then
	that all is well, then is idle again, at the beats of `Scene`. Pages go in from above, behind the body (`Feed`).
-->
<script lang="ts">
	interface Props {
		/** Without an error, or well all along. */
		runs?: 'faulty' | 'faultless' | 'well';
	}

	let { runs = 'faulty' }: Props = $props();
</script>

<g transform="translate(272 134)">
	<g class:body={runs === 'faulty'}>
		<path d="M14 2 L22 -30 H82 L90 2 Z" class="tray" />
		<rect width="104" height="66" rx="8" class="case" />
		<rect x="10" y="-3" width="84" height="7" rx="3.5" class="slot" />
		<rect x="8" y="64" width="16" height="6" rx="2" class="slot" />
		<rect x="80" y="64" width="16" height="6" rx="2" class="slot" />
		<rect x="12" y="50" width="80" height="5" rx="2.5" class="slot" />

		<rect x="32" y="13" width="40" height="28" rx="4" class="display" />
		{#if runs !== 'well'}
			<path d="M44 27h16" class="sign idle" />
		{/if}
		{#if runs === 'faulty'}
			<path d="M46 21l12 12m0-12l-12 12" class="sign error" />
		{/if}
		<path d="M43 27l6 6 12-12" class="sign good" class:well={runs !== 'well'} />
	</g>
</g>

<style>
	.case {
		fill: var(--color-primary);
	}

	.tray {
		fill: color-mix(in oklab, var(--color-primary) 55%, var(--color-base-100));
	}

	.slot {
		fill: color-mix(in oklab, var(--color-primary) 60%, black);
	}

	/* Dark in every theme, like the screen of a device */
	.display {
		fill: #101828;
	}

	.sign {
		fill: none;
		stroke: white;
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.idle {
		animation: idle var(--scene) infinite both;
	}

	.error {
		stroke: #ff6b81;
		animation: error var(--scene) infinite both;
	}

	.good {
		stroke: #5fd38d;
	}

	.well {
		animation: well var(--scene) infinite both;
	}

	.body {
		transform-origin: bottom;
		animation: jam var(--scene) infinite both;
	}

	@keyframes idle {
		0%,
		39%,
		97%,
		100% {
			opacity: 0.6;
		}
		40%,
		95% {
			opacity: 0;
		}
	}

	@keyframes error {
		0%,
		39%,
		64%,
		100% {
			opacity: 0;
		}
		40%,
		46%,
		52%,
		62% {
			opacity: 1;
		}
		43%,
		49% {
			opacity: 0.25;
		}
	}

	@keyframes well {
		0%,
		78%,
		95%,
		100% {
			opacity: 0;
		}
		82%,
		93% {
			opacity: 1;
		}
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
