<script lang="ts">
	import { getTableSettings } from './dataTableSettings.svelte';

	const { getZebra, setZebra } = getTableSettings();
</script>

<div class="card bg-base-100 p-4 shadow-md dark:bg-base-200">
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
