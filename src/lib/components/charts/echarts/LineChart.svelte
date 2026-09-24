<script lang="ts">
	import type { EChartsOption } from 'echarts';
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

	const options = $derived.by<EChartsOption>(() => ({
		title: title
			? {
					text: title,
					left: 'center',
					top: 10
				}
			: undefined,
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},
		legend: showLegend
			? {
					bottom: 10,
					type: 'scroll'
				}
			: undefined,
		grid: {
			left: '3%',
			right: '4%',
			bottom: showLegend ? 50 : 30,
			top: title ? 60 : 30,
			containLabel: true
		},
		xAxis: {
			type: 'category',
			boundaryGap: false,
			data: xAxisData,
			name: xAxisName,
			axisLabel: {
				rotate: xAxisData.length > 10 ? 45 : 0
			}
		},
		yAxis: {
			type: 'value',
			name: yAxisName
		},
		series: series.map((s) => ({
			name: s.name,
			type: 'line',
			data: s.data,
			smooth: s.smooth ?? smooth,
			lineStyle: s.lineStyle,
			areaStyle: s.areaStyle
				? {
						opacity: 0.3
					}
				: undefined,
			emphasis: {
				focus: 'series'
			}
		}))
	}));
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
