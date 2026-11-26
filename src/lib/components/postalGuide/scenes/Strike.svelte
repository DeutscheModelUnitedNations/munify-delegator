<!-- The sign that slams onto what should not be done, at 40 % of the scene, and goes at 62 %. -->
<script lang="ts">
	let { x, y, size = 1 }: { x: number; y: number; size?: number } = $props();
</script>

<g transform="translate({x} {y}) scale({size})">
	<g class="sign">
		<circle r="54" class="ring" pathLength="1" />
		<path d="M-38 -38 L38 38" class="bar" pathLength="1" />
	</g>
</g>

<style>
	.ring,
	.bar {
		fill: none;
		stroke: var(--color-error);
		stroke-width: 11;
		stroke-linecap: round;
		stroke-dasharray: 1;
	}

	.ring {
		animation: ring var(--scene) ease-out infinite both;
	}

	.bar {
		animation: bar var(--scene) ease-in infinite both;
	}

	.sign {
		animation: slam var(--scene) infinite both;
	}

	@keyframes ring {
		0%,
		39% {
			stroke-dashoffset: 1;
		}
		43%,
		100% {
			stroke-dashoffset: 0;
		}
	}

	@keyframes bar {
		0%,
		43% {
			stroke-dashoffset: 1;
			opacity: 0;
		}
		43.1% {
			stroke-dashoffset: 1;
			opacity: 1;
		}
		46%,
		100% {
			stroke-dashoffset: 0;
			opacity: 1;
		}
	}

	@keyframes slam {
		0%,
		39% {
			opacity: 0;
			transform: scale(1.7);
		}
		43% {
			opacity: 1;
			transform: scale(0.92);
		}
		46% {
			transform: scale(1.08) rotate(-4deg);
		}
		49%,
		59% {
			opacity: 1;
			transform: none;
		}
		63%,
		100% {
			opacity: 0;
			transform: scale(0.7);
		}
	}
</style>
