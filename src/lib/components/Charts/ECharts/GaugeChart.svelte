<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';

	interface Props {
		value: number;
		name?: string;
		min?: number;
		max?: number;
		title?: string;
		class?: string;
		height?: string;
		loading?: boolean;
		showDetail?: boolean;
		color?: string;
	}

	let {
		value,
		name = '',
		min = 0,
		max = 100,
		title,
		class: className = '',
		height = '200px',
		loading = false,
		showDetail = true,
		color
	}: Props = $props();

	// Determine color based on value percentage
	const getGaugeColor = (val: number): string => {
		if (color) return color;
		// Guard against division by zero
		const range = max - min;
		const percentage = range === 0 ? 100 : ((val - min) / range) * 100;
		if (percentage < 33) return '#ef4444'; // red
		if (percentage < 66) return '#f59e0b'; // amber
		return '#10b981'; // green
	};

	const options = $derived.by<EChartsOption>(() => ({
		title: title
			? {
					text: title,
					left: 'center',
					top: 5
				}
			: undefined,
		series: [
			{
				type: 'gauge',
				startAngle: 180,
				endAngle: 0,
				min,
				max,
				splitNumber: 4,
				itemStyle: {
					color: getGaugeColor(value)
				},
				progress: {
					show: true,
					roundCap: true,
					width: 12
				},
				pointer: {
					show: false
				},
				axisLine: {
					roundCap: true,
					lineStyle: {
						width: 12,
						color: [[1, '#e5e7eb']]
					}
				},
				axisTick: {
					show: false
				},
				splitLine: {
					show: false
				},
				axisLabel: {
					show: false
				},
				title: {
					show: !!name,
					offsetCenter: [0, '70%'],
					fontSize: 12
				},
				detail: {
					show: showDetail,
					offsetCenter: [0, '30%'],
					fontSize: 24,
					fontWeight: 'bold',
					formatter: '{value}%',
					color: 'inherit'
				},
				data: [
					{
						value,
						name
					}
				]
			}
		]
	}));
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
