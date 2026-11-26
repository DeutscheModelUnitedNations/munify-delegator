<!-- The amount split into small transfers cannot be matched; one transfer of the whole can. -->
<script lang="ts">
	import Check from '#lib/components/postalGuide/scenes/Check.svelte';
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import Strike from '#lib/components/postalGuide/scenes/Strike.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';

	const PARTS = [-0.05, 0, 0.05];
</script>

<Scene>
	<Phone />
	{#each PARTS as delay (delay)}
		<Coin flight="wrong" size={0.55} {delay} />
	{/each}
	<Coin flight="right" size={1.15} />
	<AccountDisplay />
	<Strike x={106} y={120} size={0.6} />
	<Check x={164} y={104} />
</Scene>
