<!-- A plastic sleeve reflects the light into the scanner. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Feed from './Feed.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
	const HOLES = [20, 42, 72, 94];
</script>

<Scene>
	<Feed>
		<g class="page"><Sheet x={90} y={72} /></g>
	</Feed>
	<g transform="translate(78 64)">
		<g class="sleeve">
			<rect width="92" height="114" rx="3" class="foil" />
			<rect width="10" height="114" rx="3" class="strip" />
			{#each HOLES as y (y)}
				<circle cx="5" cy={y} r="2.6" class="hole" />
			{/each}
			<path d="M28 4l-14 40M44 4l-22 66" class="shine" />
		</g>
	</g>
	<g transform="translate(140 96)">
		<g class="glare">
			{#each RAYS as angle (angle)}
				<path d="M-4 0L0 -74L4 0Z" transform="rotate({angle})" class="ray" />
			{/each}
			<circle r="15" class="ray" />
		</g>
	</g>
	<path d="M150 90L268 140V196Z" class="beam" />
	<Scanner />
	<Strike x={124} y={121} />
	<Check x={322} y={96} />
</Scene>

<style>
	.foil {
		fill: var(--color-info);
		fill-opacity: 0.22;
		stroke: var(--color-info);
		stroke-opacity: 0.7;
		stroke-width: 1.5;
	}

	.strip {
		fill: white;
		fill-opacity: 0.75;
		stroke: var(--color-info);
		stroke-opacity: 0.5;
	}

	.hole {
		fill: var(--color-base-100);
		stroke: var(--color-info);
	}

	.shine {
		fill: none;
		stroke: white;
		stroke-width: 6;
		stroke-linecap: round;
		opacity: 0.8;
	}

	.ray {
		fill: var(--color-warning);
	}

	.beam {
		fill: var(--color-warning);
		animation: beam var(--scene) infinite both;
	}

	.glare {
		animation: glare var(--scene) infinite both;
	}

	.sleeve {
		animation: sleeve var(--scene) infinite both;
	}

	.page {
		animation: page var(--scene) ease-in-out infinite both;
	}

	@keyframes sleeve {
		0% {
			opacity: 1;
			transform: translateY(-190px);
			animation-timing-function: ease-in;
		}
		13% {
			transform: none;
		}
		15% {
			transform: translateY(-7px);
		}
		18%,
		64% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		74% {
			opacity: 1;
			transform: translate(-40px, -120px) rotate(-24deg);
		}
		80%,
		100% {
			opacity: 0;
			transform: translate(-150px, -190px) rotate(-70deg);
		}
	}

	@keyframes glare {
		0%,
		20% {
			opacity: 0;
			transform: scale(0);
		}
		27% {
			opacity: 1;
			transform: scale(1.15) rotate(30deg);
		}
		58% {
			opacity: 1;
			transform: scale(1) rotate(120deg);
		}
		64%,
		100% {
			opacity: 0;
			transform: scale(0) rotate(160deg);
		}
	}

	@keyframes beam {
		0%,
		25%,
		64%,
		100% {
			opacity: 0;
		}
		32%,
		58% {
			opacity: 0.35;
		}
	}

	@keyframes page {
		0%,
		75% {
			transform: none;
		}
		82% {
			transform: translate(198px, -62px);
		}
		89% {
			transform: translate(198px, 68px);
		}
		/* out of sight in the scanner, the next page comes from the left */
		89.1% {
			transform: translateX(-190px);
			animation-timing-function: ease-out;
		}
		98%,
		100% {
			transform: none;
		}
	}
</style>
