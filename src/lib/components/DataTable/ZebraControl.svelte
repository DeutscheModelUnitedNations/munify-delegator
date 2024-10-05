<script lang="ts">
	import { getTableSettings } from './tableSettings.svelte';

	const { getZebra, setZebra } = getTableSettings();
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
	<div class="card-title">Zebra</div>
	<div class="card-body">
		<input
			type="checkbox"
			class="toggle"
			checked={getZebra()}
			onchange={(e: any) => {
				setZebra(e.target.checked);
			}}
		/>
	</div>
</div>
