<script lang="ts">
	interface Props {
		tab: number;
		changeTab: (tab: number) => void;
		largestNationOrNSA: number;
	}

	// `largestNationOrNSA` is used by `{#each { length: largestNationOrNSA }}` below, an array-like
	// each block fallow does not read.
	// fallow-ignore-next-line unused-component-prop
	let { tab, changeTab, largestNationOrNSA }: Props = $props();
</script>

<div role="tablist" class="tabs-box tabs mb-4">
	{#each { length: largestNationOrNSA }, i (i)}
		<button
			role="tab"
			aria-selected={tab === i + 1}
			onclick={() => changeTab(i + 1)}
			class="tab-lifted tab"
		>
			{i + 1}
		</button>
	{/each}
</div>
