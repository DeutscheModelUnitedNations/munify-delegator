<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getTableSettings } from './tableSettings.svelte';

	const { getTableSize, setTableSize } = getTableSettings();

	const sizeSteps = ['xs', 'sm', 'md', 'lg'];
	const defaultStep = 2;

	const translateTableSize = (size: string) => {
		const step = sizeSteps.indexOf(size);
		return step === -1 ? defaultStep : step;
	};
</script>

<div class="flex flex-col gap-2">
	<div class="font-semibold">{m.tableSize()}</div>
	<div>
		<input
			type="range"
			min="0"
			max="3"
			value={translateTableSize(getTableSize())}
			class="range w-full"
			step="1"
			onchange={(e) => {
				switch (e.currentTarget.value) {
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
