<!-- Mixed pages of three people are sorted and go into one envelope, next to each other. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';

	const OWNERS = ['var(--color-error)', 'var(--color-success)', 'var(--color-info)'];

	/**
	 * Every page: whose and which, and where it lies while mixed, relative to its place on the pile.
	 * The last pages come first, so the first one lies on top.
	 */
	const PAGES = [
		{ owner: 0, number: 2, x: 110, y: -56, turn: 18 },
		{ owner: 1, number: 2, x: -74, y: -8, turn: -17 },
		{ owner: 2, number: 2, x: -60, y: -48, turn: 10 },
		{ owner: 0, number: 1, x: 60, y: 6, turn: -20 },
		{ owner: 1, number: 1, x: 56, y: -30, turn: 16 },
		{ owner: 2, number: 1, x: -116, y: -22, turn: -6 }
	].map((page) => {
		const place = { x: 8 + page.owner * 78 + (page.number - 1) * 5, y: 92 - (page.number - 1) * 5 };
		return {
			...page,
			place,
			// in the envelope, side by side by person
			into: { x: 272 + page.owner * 13 - place.x, y: 88 - place.y }
		};
	});
</script>

<Scene>
	<g transform="translate(258 122)">
		<g class="envelope"><path d="M0 2L65 -40L130 2Z" class="back" /></g>
	</g>
	{#each PAGES as { owner, number, place, into, x, y, turn } (`${owner}-${number}`)}
		<g
			class="owner-{owner}"
			style:--x="{x}px"
			style:--y="{y}px"
			style:--turn="{turn}deg"
			style:--into-x="{into.x}px"
			style:--into-y="{into.y}px"
		>
			<Sheet x={place.x} y={place.y} owner={OWNERS[owner]} {number} />
		</g>
	{/each}
	<g transform="translate(258 122)">
		<g class="envelope">
			<path d="M0 0L65 30L130 0V78q0 4-4 4H4q-4 0-4-4Z" class="front" />
		</g>
	</g>
	<Check x={372} y={196} />
</Scene>

<style>
	.back {
		fill: color-mix(in oklab, var(--color-warning) 80%, black);
	}

	.front {
		fill: var(--color-warning);
	}

	.envelope {
		animation: envelope var(--scene) infinite both;
	}

	/*
	 * Every page is mixed, sorted and leaves with the envelope alike; into it they go one person after
	 * the other, the nearest first, which only moves them along (`translate`, on top of `transform`).
	 */
	.owner-2 {
		animation:
			page var(--scene) ease-in-out infinite both,
			third var(--scene) ease-in-out infinite both;
	}

	.owner-1 {
		animation:
			page var(--scene) ease-in-out infinite both,
			second var(--scene) ease-in-out infinite both;
	}

	.owner-0 {
		animation:
			page var(--scene) ease-in-out infinite both,
			first var(--scene) ease-in-out infinite both;
	}

	@keyframes envelope {
		0%,
		40% {
			transform: translateX(160px);
			animation-timing-function: ease-out;
		}
		50%,
		92% {
			transform: none;
			animation-timing-function: ease-in;
		}
		96%,
		100% {
			transform: translateX(160px);
		}
	}

	@keyframes page {
		0%,
		5% {
			transform: none;
		}
		20%,
		34% {
			transform: translate(var(--x), var(--y)) rotate(var(--turn));
		}
		48%,
		92% {
			transform: none;
			animation-timing-function: ease-in;
		}
		96% {
			transform: translateX(160px);
		}
		/* the envelope is off, the next pages come */
		96.1% {
			transform: translateX(-280px);
			animation-timing-function: ease-out;
		}
		100% {
			transform: none;
		}
	}

	@keyframes third {
		0%,
		52% {
			translate: 0 0;
		}
		58% {
			translate: var(--into-x) calc(var(--into-y) - 75px);
		}
		64%,
		96% {
			translate: var(--into-x) var(--into-y);
		}
		96.1%,
		100% {
			translate: 0 0;
		}
	}

	@keyframes second {
		0%,
		58% {
			translate: 0 0;
		}
		64% {
			translate: var(--into-x) calc(var(--into-y) - 75px);
		}
		70%,
		96% {
			translate: var(--into-x) var(--into-y);
		}
		96.1%,
		100% {
			translate: 0 0;
		}
	}

	@keyframes first {
		0%,
		64% {
			translate: 0 0;
		}
		70% {
			translate: var(--into-x) calc(var(--into-y) - 75px);
		}
		76%,
		96% {
			translate: var(--into-x) var(--into-y);
		}
		96.1%,
		100% {
			translate: 0 0;
		}
	}
</style>
