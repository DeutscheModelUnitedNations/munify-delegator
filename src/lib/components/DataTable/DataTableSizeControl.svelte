<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getTableSettings } from './dataTableSettings.svelte';

	const { getTableSize, setTableSize } = getTableSettings();

	const translateTableSize = (size: string) => {
		switch (size) {
			case 'xs':
				return 0;
			case 'sm':
				return 1;
			case 'md':
				return 2;
			case 'lg':
				return 3;
			default:
				return 2;
		}
	};
</script>

<div class="card bg-base-100 p-4 shadow-md dark:bg-base-200">
	<div class="card-title">{m.tableSize()}</div>
	<div class="card-body">
		<input
			type="range"
			min="0"
			max="3"
			value={translateTableSize(getTableSize())}
			class="range"
			step="1"
			onchange={(e: any) => {
				switch (e.target.value) {
					case '0':
						setTableSize('xs');
						break;
					case '1':
						setTableSize('sm');
						break;
					case '2':
						setTableSize('md');
						break;
					case '3':
						setTableSize('lg');
						break;
					default:
						break;
				}
			}}
		/>
		<div class="flex w-full justify-between px-2 text-xs">
			<i class="fas fa-minus"></i>
			<i class="fas fa-period -translate-y-1"></i>
			<i class="fas fa-period -translate-y-1"></i>
			<i class="fas fa-plus"></i>
		</div>
	</div>
</div>
