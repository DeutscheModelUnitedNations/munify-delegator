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
