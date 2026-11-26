<!-- From abroad, a bank on the way keeps a part unless the fees are the sender's ("OUR"). -->
<script lang="ts">
	import Check from '#lib/components/postalGuide/scenes/Check.svelte';
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import Strike from '#lib/components/postalGuide/scenes/Strike.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';
</script>

<Scene>
	<Phone>
		{#snippet iban()}
			<text x="74" y="70">GB29 NWBK …</text>
		{/snippet}
		{#snippet extra()}
			<rect x="70" y="138" width="34" height="14" rx="7" class="chip" />
			<rect x="108" y="138" width="34" height="14" rx="7" class="chip" />
			<rect x="70" y="138" width="34" height="14" rx="7" class="chosen" />
			<text x="87" y="148" class="option">SHA</text>
			<text x="125" y="148" class="option">OUR</text>
		{/snippet}
	</Phone>
	<g transform="translate(216 38)" class="globe">
		<circle r="14" />
		<ellipse rx="6" ry="14" />
		<path d="M-14 0h28M-12 -7h24M-12 7h24" />
	</g>
	<Coin bitten />
	<AccountDisplay />
	<Strike x={106} y={145} size={0.55} />
	<Check x={164} y={145} />
</Scene>

<style>
	.chip {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 1.5;
	}

	.chosen {
		fill: color-mix(in oklab, var(--color-primary) 22%, var(--paper));
		stroke: var(--color-primary);
		stroke-width: 1.5;
		animation: choose var(--scene) infinite both;
	}

	.option {
		font-family: ui-monospace, monospace;
		font-size: 8px;
		font-weight: 700;
		text-anchor: middle;
		fill: var(--ink);
	}

	.globe {
		fill: none;
		stroke: var(--color-base-content);
		stroke-width: 1.5;
		opacity: 0.35;
	}

	/* From the shared fees over to "OUR" */
	@keyframes choose {
		0%,
		63% {
			transform: none;
		}
		68%,
		94% {
			transform: translateX(38px);
		}
		98%,
		100% {
			transform: none;
		}
	}
</style>
