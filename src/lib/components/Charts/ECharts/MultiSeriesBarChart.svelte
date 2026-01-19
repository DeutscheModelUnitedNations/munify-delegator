<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';

	interface Series {
		name: string;
		data: number[];
		color?: string;
	}

	interface Props {
		labels: string[];
		series: Series[];
		title?: string;
		class?: string;
		height?: string;
		loading?: boolean;
		showValues?: boolean;
		yAxisName?: string;
		xAxisName?: string;
		stacked?: boolean;
		showLegend?: boolean;
	}

	let {
		labels,
		series,
		title,
		class: className = '',
		height = '300px',
		loading = false,
		showValues = false,
		yAxisName,
		xAxisName,
		stacked = true,
		showLegend = true
	}: Props = $props();

	// Default color palette
	const colorPalette = [
		'#3b82f6', // blue
		'#8b5cf6', // violet
		'#10b981', // emerald
		'#f59e0b', // amber
		'#ef4444', // red
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16' // lime
	];

	const options = $derived.by<EChartsOption>(() => {
		const seriesData = series.map((s, index) => ({
			name: s.name,
			type: 'bar' as const,
			stack: stacked ? 'total' : undefined,
			data: s.data,
			itemStyle: {
				color: s.color ?? colorPalette[index % colorPalette.length],
				borderRadius: stacked ? undefined : [4, 4, 0, 0]
			},
			label: showValues
				? {
						show: true,
						position: 'inside' as const,
						formatter: (params: any) => (params.value > 0 ? params.value : ''),
						fontSize: 10,
						color: '#fff'
					}
				: undefined,
			emphasis: {
				focus: 'series' as const
			}
		}));

		return {
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
					type: 'shadow'
				}
			},
			legend: showLegend
				? {
						bottom: 0,
						type: 'scroll',
						data: series.map((s) => s.name)
					}
				: undefined,
			grid: {
				left: '3%',
				right: '4%',
				bottom: showLegend ? 40 : 30,
				top: title ? 50 : 20,
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: labels,
				name: xAxisName,
				axisLabel: {
					rotate: labels.length > 12 ? 45 : 0,
					interval: 0
				}
			},
			yAxis: {
				type: 'value',
				name: yAxisName
			},
			series: seriesData
		};
	});
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
