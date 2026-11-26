<!--
	@component
	The small dark screen of a device on the stage (`Scanner`, the payment guide's account display),
	centred on `x`/`y`. It is idle, then shows an error, then that all is well, then is idle again, at
	the beats of `Scene`.
-->
<script lang="ts">
	interface Props {
		x: number;
		y: number;
		size?: number;
		/** Without an error, or well all along. */
		runs?: 'faulty' | 'faultless' | 'well';
	}

	let { x, y, size = 1, runs = 'faulty' }: Props = $props();
</script>

<g transform="translate({x} {y}) scale({size})">
	<rect x="-20" y="-14" width="40" height="28" rx="4" class="display" />
	{#if runs !== 'well'}
		<path d="M-8 0h16" class="sign idle" />
	{/if}
	{#if runs === 'faulty'}
		<path d="M-6 -6l12 12m0-12l-12 12" class="sign error" />
	{/if}
	<path d="M-9 0l6 6 12-12" class="sign good" class:well={runs !== 'well'} />
</g>

<style>
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
</style>
