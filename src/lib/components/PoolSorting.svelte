<script lang="ts">
	interface Props {
		activeSorting: string;
		sortingOptions: {
			key: string;
			name: string;
			icon: string;
		}[];
		activeFilter: string[];
		filterOptions: {
			key: string;
			name: string;
			icon?: string;
		}[];
	}

	let {
		activeSorting = $bindable(),
		sortingOptions,
		activeFilter = $bindable(),
		filterOptions
	}: Props = $props();
</script>

<div class="card bg-base-200 grid w-full grid-cols-[auto_1fr] items-center gap-4 p-4">
	<i aria-hidden="true" class="ph-duotone ph-sort-ascending self-center text-xl"></i>
	<div class="flex flex-wrap gap-2">
		{#each sortingOptions as option (option.key)}
			<button
				class="badge {option.key === activeSorting ? 'badge-primary' : ''}"
				onclick={() => (activeSorting = option.key)}
			>
				<i aria-hidden="true" class="ph-fill ph-{option.icon} mr-2"></i>
				{option.name}
			</button>
		{/each}
	</div>

	<i aria-hidden="true" class="ph-duotone ph-funnel self-center text-xl"></i>
	<div class="flex w-full flex-wrap gap-2">
		{#each filterOptions as option, optionIndex (optionIndex)}
			<button
				class="badge {activeFilter.includes(option.key) ? 'badge-primary' : ''}"
				onclick={() =>
					activeFilter.includes(option.key)
						? (activeFilter = activeFilter.filter((x) => x !== option.key))
						: activeFilter.push(option.key)}
			>
				{#if option.icon}
					<i aria-hidden="true" class="ph-fill ph-{option.icon} mr-2"></i>
				{/if}
				{option.name}
			</button>
		{/each}
	</div>
</div>
