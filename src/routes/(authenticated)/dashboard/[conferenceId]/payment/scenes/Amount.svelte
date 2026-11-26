<!-- Too little cannot be matched; exactly the amount asked for can. -->
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
		{#snippet amount()}
			<text x="74" y="96" class="less">€ 80</text>
			<text x="74" y="96" class="exact">€ 85</text>
		{/snippet}
	</Phone>
	<Coin flight="wrong" size={0.7} />
	<Coin flight="right" />
	<AccountDisplay />
	<Strike x={106} y={93} size={0.6} />
	<Check x={164} y={93} />
</Scene>

<style>
	.less {
		fill: var(--color-error);
		font-weight: 700;
		animation: less var(--scene) infinite both;
	}

	.exact {
		animation: exact var(--scene) infinite both;
	}

	@keyframes less {
		0%,
		62% {
			opacity: 1;
		}
		64%,
		100% {
			opacity: 0;
		}
	}

	@keyframes exact {
		0%,
		64% {
			opacity: 0;
		}
		67%,
		100% {
			opacity: 1;
		}
	}
</style>
