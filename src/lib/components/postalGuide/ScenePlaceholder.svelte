<!--
	@component
	Stands in for a scene that is still to be drawn: the step's icon on the stage, breathing slowly.
	Same size as a scene (`Scene`), so the guide does not jump once the scene is there. Hidden from
	screen readers like a scene: it says nothing the step's text does not.
-->
<script lang="ts">
	let { icon }: { icon: string } = $props();
</script>

<div class="stage flex items-center justify-center" aria-hidden="true">
	<i aria-hidden="true" class="ph-duotone ph-{icon} text-primary text-8xl"></i>
</div>

<style>
	.stage {
		aspect-ratio: 400 / 230;
	}

	i {
		animation: breathe 3s ease-in-out infinite;
	}

	@keyframes breathe {
		50% {
			transform: scale(1.08);
		}
	}

	/* Held by the pause button (`PostalGuide`) */
	:global([data-paused='true']) i {
		animation-play-state: paused;
	}

	@media (prefers-reduced-motion: reduce) {
		i {
			animation: none;
		}
	}
</style>
