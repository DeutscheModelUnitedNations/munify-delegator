<script lang="ts">
	interface Props {
		searchValue: string;
		changeSearchValue: (value: string) => void;
	}

	let { searchValue, changeSearchValue }: Props = $props();
</script>

<label class="no-print input input-bordered mt-6 flex items-center gap-2">
	<input
		type="text"
		class="grow"
		value={searchValue}
		placeholder="Suchen"
		oninput={(e: any) => changeSearchValue(e.target.value)}
	/>
	{#if searchValue}
		<button
			class="btn btn-square btn-ghost btn-sm"
			onclick={() => changeSearchValue('')}
			aria-label="Reset search"
		>
			<i class="fa-duotone fa-times"></i>
		</button>
	{:else}
		<i class="fa-duotone fa-magnifying-glass"></i>
	{/if}
</label>
