<script lang="ts">
	interface Props {
		tab: number;
		changeTab: (tab: number) => void;
		largestNationOrNSA: number;
	}

	let { tab, changeTab, largestNationOrNSA }: Props = $props();
</script>

<div role="tablist" class="tabs-box tabs mb-4">
	{#each { length: largestNationOrNSA } as _, i}
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
