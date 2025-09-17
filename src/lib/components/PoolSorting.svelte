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

<div class="rounnded-md card grid w-full grid-cols-[auto_1fr] items-center gap-4 bg-base-200 p-4">
	<i class="fa-duotone fa-arrow-down-short-wide self-center text-xl"></i>
	<div class="flex flex-wrap gap-2">
		{#each sortingOptions as option}
			<button
				class="badge {option.key === activeSorting ? 'badge-primary' : ''}"
				onclick={() => (activeSorting = option.key)}
			>
				<i class="fas fa-{option.icon} mr-2"></i>
				{option.name}
			</button>
		{/each}
	</div>

	<i class="fa-duotone fa-filter self-center text-xl"></i>
	<div class="flex w-full flex-wrap gap-2">
		{#each filterOptions as option}
			<button
				class="badge {activeFilter.includes(option.key) ? 'badge-primary' : ''}"
				onclick={() =>
					activeFilter.includes(option.key)
						? (activeFilter = activeFilter.filter((x) => x !== option.key))
						: activeFilter.push(option.key)}
			>
				{#if option.icon}
					<i class="fas fa-{option.icon} mr-2"></i>
				{/if}
				{option.name}
			</button>
		{/each}
	</div>
</div>
