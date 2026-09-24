<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';

	interface Props {
		labels: string[];
		values: number[];
		title?: string;
		horizontal?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
		showValues?: boolean;
		yAxisName?: string;
		xAxisName?: string;
		color?: string;
	}

	let {
		labels,
		values,
		title,
		horizontal = false,
		class: className = '',
		height = '300px',
		loading = false,
		showValues = true,
		yAxisName,
		xAxisName,
		color
	}: Props = $props();

	const options = $derived.by<EChartsOption>(() => {
		const categoryAxis = {
			type: 'category' as const,
			data: labels,
			name: horizontal ? yAxisName : xAxisName,
			axisLabel: {
				rotate: !horizontal && labels.length > 8 ? 45 : 0,
				interval: 0
			}
		};

		const valueAxis = {
			type: 'value' as const,
			name: horizontal ? xAxisName : yAxisName
		};

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
			grid: {
				left: '3%',
				right: '4%',
				bottom: 30,
				top: title ? 50 : 20,
				containLabel: true
			},
			xAxis: horizontal ? valueAxis : categoryAxis,
			yAxis: horizontal ? categoryAxis : valueAxis,
			series: [
				{
					type: 'bar',
					data: values,
					itemStyle: color
						? { color }
						: {
								borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
							},
					label: showValues
						? {
								show: true,
								position: horizontal ? 'right' : 'top',
								formatter: '{c}'
							}
						: undefined,
					emphasis: {
						itemStyle: {
							shadowBlur: 10,
							shadowColor: 'rgba(0,0,0,0.3)'
						}
					}
				}
			]
		};
	});
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
