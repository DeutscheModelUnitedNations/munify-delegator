<!-- Words of one's own as the purpose cannot be matched; the reference pasted as it is can. -->
<script lang="ts">
	import Check from '#lib/components/postalGuide/scenes/Check.svelte';
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import Strike from '#lib/components/postalGuide/scenes/Strike.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';
	import ReferenceCode from './ReferenceCode.svelte';
</script>

<Scene>
	<Phone>
		{#snippet purpose()}
			<path
				d="M75 121q3-5 6 0t6 0 6 0m5 0q3-5 6 0t6 0m5 0q3-5 6 0t6 0 6 0"
				class="words"
				pathLength="1"
			/>
			<g class="reference">
				<rect x="72" y="114" width="68" height="12" rx="2" class="marked" />
				<ReferenceCode x={106} y={123} />
			</g>
		{/snippet}
	</Phone>
	<Coin />
	<AccountDisplay />
	<Strike x={106} y={120} size={0.6} />
	<Check x={164} y={104} />
</Scene>

<style>
	.words {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-dasharray: 1;
		animation: write var(--scene) infinite both;
	}

	.marked {
		fill: color-mix(in oklab, var(--color-primary) 18%, var(--paper));
	}

	.reference {
		animation: paste var(--scene) infinite both;
	}

	/* Typed in by hand, gone once struck through */
	@keyframes write {
		0%,
		4% {
			stroke-dashoffset: 1;
			opacity: 1;
		}
		16%,
		62% {
			stroke-dashoffset: 0;
			opacity: 1;
		}
		65%,
		100% {
			stroke-dashoffset: 0;
			opacity: 0;
		}
	}

	/* Pasted in one go, as it is */
	@keyframes paste {
		0%,
		65% {
			opacity: 0;
			transform: scale(0.4);
		}
		68% {
			opacity: 1;
			transform: scale(1.12);
		}
		70%,
		94% {
			opacity: 1;
			transform: none;
		}
		97%,
		100% {
			opacity: 0;
			transform: none;
		}
	}
</style>
