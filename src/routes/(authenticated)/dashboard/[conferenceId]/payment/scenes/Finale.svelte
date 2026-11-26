<!-- The payment guide's end picture: transfers arrive one after the other, every one matched. -->
<script lang="ts">
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';

	const COINS = [0, 1, 2, 3];
</script>

<Scene>
	<Phone presses={false} />
	{#each COINS as coin (coin)}
		<g class="sent" style:--start={coin / COINS.length}><Coin flight="none" /></g>
	{/each}
	<AccountDisplay runs="well" />
</Scene>

<style>
	/* A coin every quarter of the loop, over in an arc and into the screen */
	.sent {
		animation: sent var(--scene) calc(var(--scene) * var(--start)) infinite both;
	}

	@keyframes sent {
		0% {
			opacity: 0;
			transform: none;
		}
		2% {
			opacity: 1;
			transform: translate(0, -24px);
			animation-timing-function: ease-out;
		}
		10% {
			transform: translate(110px, -110px);
			animation-timing-function: ease-in;
		}
		19% {
			opacity: 1;
			transform: translate(218px, -8px) scale(0.6);
		}
		21%,
		100% {
			opacity: 0;
			transform: translate(218px, -8px) scale(0);
		}
	}
</style>
