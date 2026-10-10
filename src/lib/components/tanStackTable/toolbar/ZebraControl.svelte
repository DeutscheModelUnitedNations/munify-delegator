<script lang="ts">
	import { getTableSettings } from './tableSettings.svelte';

	const { getZebra, setZebra } = getTableSettings();
</script>

<label class="flex items-center justify-between gap-2 font-semibold">
	Zebra
	<input
		type="checkbox"
		class="toggle"
		checked={getZebra()}
		onchange={(e) => {
			setZebra(e.currentTarget.checked);
		}}
	/>
</label>
