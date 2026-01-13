<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import EChartsBase from './EChartsBase.svelte';
	import type { PieChartData } from './types';

	interface Props {
		data: PieChartData[];
		title?: string;
		donut?: boolean;
		showLegend?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
	}

	let {
		data,
		title,
		donut = false,
		showLegend = true,
		class: className = '',
		height = '300px',
		loading = false
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
			trigger: 'item',
			formatter: '{b}: {c} ({d}%)'
		},
		legend: showLegend
			? {
					orient: 'horizontal',
					bottom: 10,
					type: 'scroll'
				}
			: undefined,
		series: [
			{
				type: 'pie',
				radius: donut ? ['35%', '60%'] : '60%',
				center: showLegend ? ['50%', '45%'] : ['50%', '50%'],
				data: data,
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)'
					}
				},
				label: {
					show: !showLegend,
					formatter: '{b}: {d}%'
				},
				labelLine: {
					show: !showLegend
				}
			}
		]
	}));
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
