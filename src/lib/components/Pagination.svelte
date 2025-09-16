<script lang="ts">
	interface Props {
		active: number;
		total: number;
		setPage: (index: number) => void;
	}

	let { active, total, setPage }: Props = $props();
</script>

<div class="join">
	<button
		class="btn join-item btn-sm"
		disabled={active === 1}
		onclick={() => setPage(active - 1)}
		aria-label="Previous page"
	>
		<i class="fas fa-chevron-left"></i>
	</button>

	{#each Array.from({ length: total }, (_, i) => i) as index}
		<button
			class="btn join-item btn-sm {active === index + 1 && 'btn-primary'}"
			onclick={() => setPage(index + 1)}
		>
			{index + 1}
		</button>
	{/each}

	<button
		class="btn join-item btn-sm"
		aria-label="Next page"
		disabled={active === total}
		onclick={() => setPage(active + 1)}
	>
		<i class="fas fa-chevron-right"></i>
	</button>
</div>
