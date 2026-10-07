<script lang="ts">
	import { pieChartOptions } from './chartOptions';
	import EChartsBase from './EChartsBase.svelte';
	import type { PieChartData } from './types';

	interface Props {
		data: PieChartData[];
		title?: string;
		donut?: boolean;
		showLegend?: boolean;
		showLabels?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
	}

	let {
		data,
		title,
		donut = false,
		showLegend = true,
		showLabels,
		class: className = '',
		height = '300px',
		loading = false
	}: Props = $props();

	const options = $derived(pieChartOptions({ data, title, donut, showLegend, showLabels }));
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
