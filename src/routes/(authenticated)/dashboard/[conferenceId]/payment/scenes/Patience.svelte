<!-- A transfer takes some working days; its way shows open, on its way, received. -->
<script lang="ts">
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';

	/** Calendar days, the bottom one first: it stays, the others fall off from the top. */
	const DAYS = [15, 14, 13, 12];
	const STAGES = ['open', 'on-its-way', 'received'];
</script>

<Scene>
	<Phone />
	<g transform="translate(184 40)">
		{#each DAYS as day (day)}
			<g class="day-{day}">
				<rect width="64" height="58" rx="5" class="page" />
				<path d="M0 5a5 5 0 0 1 5-5h54a5 5 0 0 1 5 5v9H0Z" class="binding" />
				<text x="32" y="46" class="day">{day}</text>
			</g>
		{/each}
	</g>
	<g transform="translate(188 132)">
		<path d="M0 0h56" class="track" />
		{#each STAGES as stage, index (stage)}
			<circle cx={index * 28} r="7" class="stage-dot" />
			<circle cx={index * 28} r="7" class="reached {stage}" />
		{/each}
	</g>
	<Coin flight="wrong" />
	<AccountDisplay runs="faultless" />
</Scene>

<style>
	.page {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.5;
	}

	.binding {
		fill: var(--color-error);
	}

	.day {
		font-size: 24px;
		font-weight: 700;
		text-anchor: middle;
		fill: var(--ink);
	}

	.track {
		stroke: var(--color-base-content);
		stroke-width: 3;
		opacity: 0.2;
	}

	.stage-dot {
		fill: var(--color-base-100);
		stroke: var(--color-base-content);
		stroke-width: 2;
		stroke-opacity: 0.3;
	}

	.reached {
		fill: var(--color-warning);
	}

	.received {
		fill: var(--color-success);
	}

	.open {
		animation: open var(--scene) infinite both;
	}

	.on-its-way {
		animation: on-its-way var(--scene) infinite both;
	}

	.received {
		animation: received var(--scene) infinite both;
	}

	/* Calmly, one day after the other, back on the block for the next loop */
	.day-12 {
		animation: fall-first var(--scene) infinite both;
	}

	.day-13 {
		animation: fall-second var(--scene) infinite both;
	}

	.day-14 {
		animation: fall-third var(--scene) infinite both;
	}

	@keyframes fall-first {
		0%,
		38% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		48%,
		95% {
			opacity: 0;
			transform: translate(40px, 110px) rotate(35deg);
		}
		96% {
			opacity: 0;
			transform: none;
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes fall-second {
		0%,
		50% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		60%,
		95% {
			opacity: 0;
			transform: translate(40px, 110px) rotate(35deg);
		}
		96% {
			opacity: 0;
			transform: none;
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes fall-third {
		0%,
		62% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		72%,
		95% {
			opacity: 0;
			transform: translate(40px, 110px) rotate(35deg);
		}
		96% {
			opacity: 0;
			transform: none;
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes open {
		0%,
		20% {
			transform: scale(0);
		}
		24%,
		95% {
			transform: none;
		}
		98%,
		100% {
			transform: scale(0);
		}
	}

	@keyframes on-its-way {
		0%,
		50% {
			transform: scale(0);
		}
		54%,
		95% {
			transform: none;
		}
		98%,
		100% {
			transform: scale(0);
		}
	}

	@keyframes received {
		0%,
		78% {
			transform: scale(0);
		}
		82% {
			transform: scale(1.3);
		}
		85%,
		95% {
			transform: none;
		}
		98%,
		100% {
			transform: scale(0);
		}
	}
</style>
