<script lang="ts">
	import { lineChartOptions } from './chartOptions';
	import EChartsBase from './EChartsBase.svelte';
	import type { LineChartSeries } from './types';

	interface Props {
		xAxisData: string[];
		series: LineChartSeries[];
		title?: string;
		showLegend?: boolean;
		smooth?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
		yAxisName?: string;
		xAxisName?: string;
	}

	let {
		xAxisData,
		series,
		title,
		showLegend = true,
		smooth = true,
		class: className = '',
		height = '300px',
		loading = false,
		yAxisName,
		xAxisName
	}: Props = $props();

	const options = $derived(
		lineChartOptions({ xAxisData, series, title, showLegend, smooth, yAxisName, xAxisName })
	);
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
