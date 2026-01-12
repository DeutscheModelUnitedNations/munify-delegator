<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';

	interface StackedBarData {
		name: string;
		value: number;
		color?: string;
	}

	interface Props {
		data: StackedBarData[];
		horizontal?: boolean;
		showLabels?: boolean;
		showPercentage?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
	}

	let {
		data,
		horizontal = true,
		showLabels = true,
		showPercentage = true,
		class: className = '',
		height = '60px',
		loading = false
	}: Props = $props();

	const total = $derived(data.reduce((sum, item) => sum + item.value, 0));

	const options = $derived.by<EChartsOption>(() => {
		// Build series data for stacked bar
		const seriesData = data.map((item, index) => ({
			name: item.name,
			type: 'bar' as const,
			stack: 'total',
			data: [item.value],
			itemStyle: item.color ? { color: item.color } : undefined,
			label: {
				show: showLabels && item.value > 0,
				position: 'inside' as const,
				formatter: (params: any) => {
					const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
					if (showPercentage && percent > 10) {
						return `${percent}%`;
					}
					return '';
				},
				fontSize: 12,
				color: '#fff',
				fontWeight: 'bold' as const
			},
			emphasis: {
				focus: 'series' as const
			}
		}));

		if (horizontal) {
			return {
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const percent = total > 0 ? Math.round((params.value / total) * 100) : 0;
						return `${params.seriesName}: ${params.value} (${percent}%)`;
					}
				},
				grid: {
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
					containLabel: false
				},
				xAxis: {
					type: 'value',
					show: false,
					max: total
				},
				yAxis: {
					type: 'category',
					show: false,
					data: ['']
				},
				series: seriesData
			};
		} else {
			return {
				tooltip: {
					trigger: 'item',
					formatter: (params: any) => {
						const percent = total > 0 ? Math.round((params.value / total) * 100) : 0;
						return `${params.seriesName}: ${params.value} (${percent}%)`;
					}
				},
				grid: {
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
					containLabel: false
				},
				xAxis: {
					type: 'category',
					show: false,
					data: ['']
				},
				yAxis: {
					type: 'value',
					show: false,
					max: total
				},
				series: seriesData
			};
		}
	});
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
