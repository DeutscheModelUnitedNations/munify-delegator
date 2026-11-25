<!-- The tick that pops up once the right way is shown, at 80 % of the scene. -->
<script lang="ts">
	let { x, y }: { x: number; y: number } = $props();
</script>

<g transform="translate({x} {y})">
	<g class="tick">
		<circle r="20" class="disc" />
		<path d="M-9 0l6.5 7L10 -7" class="mark" />
	</g>
</g>

<style>
	.disc {
		fill: var(--color-success);
	}

	.mark {
		fill: none;
		stroke: var(--color-success-content);
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.tick {
		animation: pop var(--scene) infinite both;
	}

	@keyframes pop {
		0%,
		80% {
			opacity: 0;
			transform: scale(0);
		}
		84% {
			opacity: 1;
			transform: scale(1.2);
		}
		87%,
		92% {
			opacity: 1;
			transform: none;
		}
		96%,
		100% {
			opacity: 0;
			transform: scale(0);
		}
	}
</style>
