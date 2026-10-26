<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';
	import { gaugeColor } from './gaugeColor';

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

	const getGaugeColor = (val: number): string => color ?? gaugeColor(val, min, max);

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
