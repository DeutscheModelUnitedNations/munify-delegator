<!-- An IBAN typed by hand gets digits swapped; the GiroCode fills in every field as it is. -->
<script lang="ts">
	import Check from '#lib/components/postalGuide/scenes/Check.svelte';
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import Strike from '#lib/components/postalGuide/scenes/Strike.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';

	/** The code's modules beside its three finder squares, on a 9 × 9 grid. */
	const MODULES = [
		[4, 0],
		[4, 1],
		[5, 2],
		[4, 3],
		[6, 4],
		[8, 4],
		[0, 4],
		[2, 4],
		[3, 5],
		[5, 5],
		[4, 6],
		[7, 6],
		[5, 7],
		[8, 7],
		[4, 8],
		[6, 8],
		[7, 8],
		[1, 5]
	];
	const FINDERS = [
		[0, 0],
		[6, 0],
		[0, 6]
	];
</script>

<Scene>
	<Phone>
		{#snippet iban()}
			<text x="74" y="70" class="typed">DE89 37<tspan class="swapped">40</tspan> …</text>
			<text x="74" y="70" class="scanned">DE89 3704 …</text>
		{/snippet}
	</Phone>
	<g class="code">
		<rect x="190" y="50" width="62" height="62" rx="4" class="card" />
		<g transform="translate(197 57) scale(5.33)">
			{#each FINDERS as [x, y] (`${x}-${y}`)}
				<rect {x} {y} width="3" height="3" class="dot" />
				<rect x={x + 0.6} y={y + 0.6} width="1.8" height="1.8" class="card" />
				<rect x={x + 1.1} y={y + 1.1} width="0.8" height="0.8" class="dot" />
			{/each}
			{#each MODULES as [x, y] (`${x}-${y}`)}
				<rect {x} {y} width="1" height="1" class="dot" />
			{/each}
		</g>
		<rect x="190" y="50" width="62" height="3" class="beam" />
	</g>
	<Coin />
	<AccountDisplay />
	<Strike x={106} y={67} size={0.55} />
	<Check x={164} y={67} />
</Scene>

<style>
	.card {
		fill: var(--paper);
	}

	.dot {
		fill: var(--ink);
	}

	.swapped {
		fill: var(--color-error);
		font-weight: 700;
	}

	.beam {
		fill: #5fd38d;
		animation: beam var(--scene) infinite both;
	}

	.code {
		animation: code var(--scene) infinite both;
	}

	.typed {
		animation: typed var(--scene) infinite both;
	}

	.scanned {
		animation: scanned var(--scene) infinite both;
	}

	@keyframes typed {
		0%,
		4% {
			opacity: 0;
		}
		8%,
		62% {
			opacity: 1;
		}
		64%,
		100% {
			opacity: 0;
		}
	}

	/* Read once, everything is there at once */
	@keyframes scanned {
		0%,
		69% {
			opacity: 0;
		}
		70%,
		94% {
			opacity: 1;
		}
		97%,
		100% {
			opacity: 0;
		}
	}

	@keyframes code {
		0%,
		62% {
			opacity: 0;
			transform: scale(0.6);
		}
		65%,
		93% {
			opacity: 1;
			transform: none;
		}
		97%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	@keyframes beam {
		0%,
		64% {
			opacity: 0;
			transform: none;
		}
		65% {
			opacity: 0.9;
			transform: none;
		}
		69% {
			opacity: 0.9;
			transform: translateY(59px);
		}
		70%,
		100% {
			opacity: 0;
			transform: translateY(59px);
		}
	}
</style>
