<!-- <script lang="ts">
	import { languageTag } from "$lib/paraglide/runtime";

	interface Props {
		title: string;
		globalSearchValue?: string;
	}

	let { title, globalSearchValue }: Props = $props();
</script>

<div class="print-only my-10">
	<h1 class="text-2xl font-bold">{title}</h1>
	<h2 class="text-lg">
		Erstellt am {new Date().toLocaleDateString(languageTag())} um {new Date().toLocaleTimeString()}
	</h2>
	<h3 class="text-xs">Export aus MUNify Delegator</h3>

	{#if globalSearchValue}
		<h4 class="text-xs">Suche: {globalSearchValue}</h4>
	{/if}

	<div class="alert alert-warning mt-6">
		<i class="fas fa-diamond-exclamation"></i>
		<p>
			Bitte beachte, dass dieser Export sensible Daten enthält und nur an Personen weitergegeben
			werden sollte, die dazu berechtigt sind.
		</p>
	</div>
</div> -->
