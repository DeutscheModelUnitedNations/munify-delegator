import type { EChartsOption, SetOptionOpts } from 'echarts';

export type { EChartsOption, SetOptionOpts };

export interface ChartTheme {
	backgroundColor: string;
	textColor: string;
	axisColor: string;
	splitLineColor: string;
	colorPalette: string[];
}

export interface BaseChartProps {
	class?: string;
	height?: string;
	loading?: boolean;
}

export interface PieChartData {
	name: string;
	value: number;
}

export interface LineChartSeries {
	name: string;
	data: number[];
	smooth?: boolean;
	areaStyle?: boolean;
	lineStyle?: { width?: number };
}

export interface GaugeChartData {
	value: number;
	name: string;
}

export interface BarChartData {
	labels: string[];
	values: number[];
}
