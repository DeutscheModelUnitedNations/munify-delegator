<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	interface Props {
		alpha2Code: string | null;
		alpha3Code: string | null;
		nsaName: string | null;
		nsaIcon: string | null;
	}

	let { alpha2Code, alpha3Code, nsaName, nsaIcon }: Props = $props();

	const translatedName = $derived(
		alpha3Code ? getFullTranslatedCountryNameFromISO3Code(alpha3Code) : null
	);
</script>

{#if nsaName}
	<span class="flex items-center gap-1.5">
		<Flag size="xs" nsa icon={nsaIcon} />
		<span class="truncate">{nsaName}</span>
	</span>
{:else if alpha2Code}
	<span class="flex items-center gap-1.5">
		<Flag size="xs" {alpha2Code} />
		<span class="truncate">{translatedName ?? alpha2Code}</span>
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
