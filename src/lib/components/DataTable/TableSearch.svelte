<script lang="ts">
	interface Props {
		searchValue: string;
		changeSearchValue: (value: string) => void;
	}

	let { searchValue, changeSearchValue }: Props = $props();
</script>

<label class="input input-bordered flex items-center gap-2 mt-6 no-print">
	<input
		type="text"
		class="grow"
		value={searchValue}
		placeholder="Suchen"
		oninput={(e: any) => changeSearchValue(e.target.value)}
	/>
	<i class="fa-duotone fa-magnifying-glass"></i>
</label>
