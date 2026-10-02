import type {
	DefaultLabelFormatterCallbackParams,
	EChartsOption,
	TooltipComponentFormatterCallbackParams
} from 'echarts';
import type { LineChartSeries, PieChartData } from './types';

export interface ThemeColors {
	textColor: string;
	backgroundColor: string;
	borderColor: string;
}

/** The centered title every chart shows above its plot, or none when it has no title. */
export function chartTitle(title: string | undefined) {
	return title ? { text: title, left: 'center', top: 10 } : undefined;
}

/** Fills in the palette, background and text color a chart's own options leave unset. */
export function themedChartOptions(
	options: EChartsOption,
	theme: ThemeColors,
	palette: string[]
): EChartsOption {
	return {
		...options,
		color: options.color || palette,
		backgroundColor: options.backgroundColor || theme.backgroundColor,
		textStyle: {
			color: theme.textColor,
			...(options.textStyle || {})
		}
	};
}

export interface BarChartParams {
	labels: string[];
	values: number[];
	title?: string;
	horizontal: boolean;
	showValues: boolean;
	yAxisName?: string;
	xAxisName?: string;
	color?: string;
}

export function barChartOptions(p: BarChartParams): EChartsOption {
	const { horizontal } = p;
	const categoryAxis = {
		type: 'category' as const,
		data: p.labels,
		name: horizontal ? p.yAxisName : p.xAxisName,
		axisLabel: {
			rotate: !horizontal && p.labels.length > 8 ? 45 : 0,
			interval: 0
		}
	};

	const valueAxis = {
		type: 'value' as const,
		name: horizontal ? p.xAxisName : p.yAxisName
	};

	const label = p.showValues
		? { show: true, position: horizontal ? ('right' as const) : ('top' as const), formatter: '{c}' }
		: undefined;

	return {
		title: chartTitle(p.title),
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
			top: p.title ? 50 : 20,
			containLabel: true
		},
		xAxis: horizontal ? valueAxis : categoryAxis,
		yAxis: horizontal ? categoryAxis : valueAxis,
		series: [
			{
				type: 'bar',
				data: p.values,
				itemStyle: p.color
					? { color: p.color }
					: { borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
				label,
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowColor: 'rgba(0,0,0,0.3)'
					}
				}
			}
		]
	};
}

export interface LineChartParams {
	xAxisData: string[];
	series: LineChartSeries[];
	title?: string;
	showLegend: boolean;
	smooth: boolean;
	yAxisName?: string;
	xAxisName?: string;
}

export function lineChartOptions(p: LineChartParams): EChartsOption {
	return {
		title: chartTitle(p.title),
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},
		legend: p.showLegend ? { bottom: 10, type: 'scroll' } : undefined,
		grid: {
			left: '3%',
			right: '4%',
			bottom: p.showLegend ? 50 : 30,
			top: p.title ? 60 : 30,
			containLabel: true
		},
		xAxis: {
			type: 'category',
			boundaryGap: false,
			data: p.xAxisData,
			name: p.xAxisName,
			axisLabel: {
				rotate: p.xAxisData.length > 10 ? 45 : 0
			}
		},
		yAxis: {
			type: 'value',
			name: p.yAxisName
		},
		series: p.series.map((s) => ({
			name: s.name,
			type: 'line',
			data: s.data,
			smooth: s.smooth ?? p.smooth,
			lineStyle: s.lineStyle,
			areaStyle: s.areaStyle ? { opacity: 0.3 } : undefined,
			emphasis: {
				focus: 'series'
			}
		}))
	};
}

export interface MultiSeriesBarSeries {
	name: string;
	data: number[];
	color?: string;
}

export interface MultiSeriesBarChartParams {
	labels: string[];
	series: MultiSeriesBarSeries[];
	title?: string;
	showValues: boolean;
	yAxisName?: string;
	xAxisName?: string;
	stacked: boolean;
	showLegend: boolean;
}

/** The default palette of the multi-series bar chart, cycled through for series without a color. */
export const multiSeriesPalette = [
	'#3b82f6', // blue
	'#8b5cf6', // violet
	'#10b981', // emerald
	'#f59e0b', // amber
	'#ef4444', // red
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#84cc16' // lime
];

/** A segment's value label: its number when positive, nothing otherwise. */
export function positiveValueLabel(params: DefaultLabelFormatterCallbackParams) {
	return typeof params.value === 'number' && params.value > 0 ? String(params.value) : '';
}

const insideValueLabel = {
	show: true,
	position: 'inside' as const,
	formatter: positiveValueLabel,
	fontSize: 10,
	color: '#fff'
};

export function multiSeriesBarChartOptions(p: MultiSeriesBarChartParams): EChartsOption {
	const { stacked } = p;
	const seriesData = p.series.map((s, index) => ({
		name: s.name,
		type: 'bar' as const,
		stack: stacked ? 'total' : undefined,
		data: s.data,
		itemStyle: {
			color: s.color ?? multiSeriesPalette[index % multiSeriesPalette.length],
			borderRadius: stacked ? undefined : [4, 4, 0, 0]
		},
		label: p.showValues ? insideValueLabel : undefined,
		emphasis: {
			focus: 'series' as const
		}
	}));

	return {
		title: chartTitle(p.title),
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow'
			}
		},
		legend: p.showLegend
			? { bottom: 0, type: 'scroll', data: p.series.map((s) => s.name) }
			: undefined,
		grid: {
			left: '3%',
			right: '4%',
			bottom: p.showLegend ? 40 : 30,
			top: p.title ? 50 : 20,
			containLabel: true
		},
		xAxis: {
			type: 'category',
			data: p.labels,
			name: p.xAxisName,
			axisLabel: {
				rotate: p.labels.length > 12 ? 45 : 0,
				interval: 0
			}
		},
		yAxis: {
			type: 'value',
			name: p.yAxisName
		},
		series: seriesData
	};
}

export interface PieChartParams {
	data: PieChartData[];
	title?: string;
	donut: boolean;
	showLegend: boolean;
	/** Whether slices carry labels; defaults to showing them when the legend is hidden. */
	showLabels?: boolean;
}

export function pieChartOptions(p: PieChartParams): EChartsOption {
	const labelsVisible = p.showLabels ?? !p.showLegend;
	return {
		title: chartTitle(p.title),
		tooltip: {
			trigger: 'item',
			formatter: '{b}: {c} ({d}%)'
		},
		legend: p.showLegend ? { orient: 'horizontal', bottom: 10, type: 'scroll' } : undefined,
		series: [
			{
				type: 'pie',
				radius: p.donut ? ['35%', '60%'] : '60%',
				center: p.showLegend ? ['50%', '45%'] : ['50%', '50%'],
				data: p.data,
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)'
					}
				},
				label: {
					show: labelsVisible,
					formatter: '{b}: {d}%'
				},
				labelLine: {
					show: labelsVisible
				}
			}
		]
	};
}

/** `part` as a rounded percentage of `total`, or 0 when there is no total. */
export function percentOf(part: number, total: number) {
	return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * The stacked bar's tooltip. Every bar is its own series with a single numeric value, and the
 * tooltip triggers per item, so the callback is handed one data point.
 */
export function stackedBarTooltip(params: TooltipComponentFormatterCallbackParams, total: number) {
	const point = Array.isArray(params) ? params[0] : params;
	const value = typeof point?.value === 'number' ? point.value : 0;
	return `${point?.seriesName}: ${value} (${percentOf(value, total)}%)`;
}
