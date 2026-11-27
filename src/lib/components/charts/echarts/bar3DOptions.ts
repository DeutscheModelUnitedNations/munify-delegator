import type { ThemeColors } from './chartOptions';

/**
 * Options for echarts-gl's stacked 3D bar chart (`Bar3DChart.svelte`). echarts-gl has no types,
 * so the part of its option format used here is declared below; echarts' own `EChartsOption`
 * knows neither `grid3D` nor `bar3D`.
 */

/** One stacked layer of bars: a value per cell of the x × y grid. */
export interface Bar3DSeries {
	name: string;
	color: string;
	/** Cells by index into `xLabels` and `yLabels`; cells left out stay empty. */
	data: Array<{ x: number; y: number; value: number }>;
}

export interface Bar3DChartData {
	/** The categories along the front edge (the x axis). */
	xLabels: string[];
	/** The categories going back in depth (the y axis). */
	yLabels: string[];
	series: Bar3DSeries[];
	xName: string;
	yName: string;
	/** What the height counts. */
	zName: string;
}

interface Axis3D {
	type: 'category' | 'value';
	name: string;
	nameGap: number;
	data?: string[];
	minInterval?: number;
	nameTextStyle: { color: string };
	axisLabel: { interval?: number; textStyle: { color: string } };
	axisLine: { lineStyle: { color: string } };
	splitLine: { lineStyle: { color: string } };
}

interface Bar3DSeriesOption {
	type: 'bar3D';
	name: string;
	stack: string;
	shading: 'lambert';
	itemStyle: { color: string; opacity: number };
	emphasis: { label: { show: boolean } };
	data: Array<{ value: [number, number, number]; itemStyle?: { opacity: number } }>;
	animationDurationUpdate: number;
}

// A type, not an interface: echarts' `setOption` wants an index signature, which only types infer.
export type Bar3DOption = {
	tooltip: { formatter: (params: Bar3DTooltipParams) => string };
	legend: { data: string[]; top: number; textStyle: { color: string } };
	xAxis3D: Axis3D;
	yAxis3D: Axis3D;
	zAxis3D: Axis3D;
	grid3D: {
		boxWidth: number;
		boxDepth: number;
		top: number;
		viewControl: {
			alpha: number;
			beta: number;
			distance: number;
			autoRotate: boolean;
			autoRotateSpeed: number;
			autoRotateAfterStill: number;
		};
		light: { main: { intensity: number; shadow: boolean }; ambient: { intensity: number } };
		axisPointer: { lineStyle: { color: string } };
	};
	series: Bar3DSeriesOption[];
};

/** What echarts-gl hands the tooltip formatter for a bar. */
export interface Bar3DTooltipParams {
	seriesName?: string;
	value?: unknown;
}

function axis({
	name,
	data,
	theme
}: {
	name: string;
	data?: string[];
	theme: ThemeColors;
}): Axis3D {
	return {
		type: data ? 'category' : 'value',
		name,
		// Clear of the category labels, which are long for countries.
		nameGap: data ? 45 : 25,
		...(data ? { data } : { minInterval: 1 }),
		nameTextStyle: { color: theme.textColor },
		// Every category label: echarts' automatic thinning would hide which bar is which.
		axisLabel: { ...(data ? { interval: 0 } : {}), textStyle: { color: theme.textColor } },
		axisLine: { lineStyle: { color: theme.textColor } },
		splitLine: { lineStyle: { color: theme.borderColor } }
	};
}

/** The tooltip of one bar: its x and y category, its layer and its value. */
export function bar3DTooltip({
	params,
	xLabels,
	yLabels
}: {
	params: Bar3DTooltipParams;
	xLabels: string[];
	yLabels: string[];
}) {
	const value = Array.isArray(params.value) ? params.value : [];
	const [x, y, z] = value;
	// Empty cells are invisible bars: they get no tooltip either.
	if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || z === 0) return '';
	return `${xLabels[x] ?? ''} · ${yLabels[y] ?? ''}<br/>${params.seriesName ?? ''}: <b>${z}</b>`;
}

/**
 * The chart's options: every series stacked into one column per cell, the box sized to the
 * categories so long axes are not squeezed, and the camera turning slowly unless `reducedMotion`.
 */
export function bar3DOptions({
	data,
	theme,
	reducedMotion
}: {
	data: Bar3DChartData;
	theme: ThemeColors;
	reducedMotion: boolean;
}): Bar3DOption {
	const { xLabels, yLabels } = data;
	return {
		tooltip: { formatter: (params) => bar3DTooltip({ params, xLabels, yLabels }) },
		legend: {
			data: data.series.map((series) => series.name),
			top: 0,
			textStyle: { color: theme.textColor }
		},
		xAxis3D: axis({ name: data.xName, data: xLabels, theme }),
		yAxis3D: axis({ name: data.yName, data: yLabels, theme }),
		zAxis3D: axis({ name: data.zName, theme }),
		grid3D: {
			boxWidth: Math.min(240, Math.max(120, xLabels.length * 16)),
			boxDepth: Math.min(180, Math.max(80, yLabels.length * 22)),
			top: 10,
			viewControl: {
				alpha: 25,
				beta: 35,
				distance: 260,
				autoRotate: !reducedMotion,
				autoRotateSpeed: 4,
				autoRotateAfterStill: 5
			},
			light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.35 } },
			axisPointer: { lineStyle: { color: theme.borderColor } }
		},
		series: data.series.map((series) => {
			const values = new Map(series.data.map((cell) => [`${cell.x}:${cell.y}`, cell.value]));
			return {
				type: 'bar3D',
				name: series.name,
				stack: 'total',
				shading: 'lambert',
				itemStyle: { color: series.color, opacity: 1 },
				emphasis: { label: { show: false } },
				// echarts-gl stacks by index, so every series lists the whole grid in the same order;
				// empty cells are invisible instead of left out.
				data: xLabels.flatMap((_x, x) =>
					yLabels.map((_y, y) => {
						const value = values.get(`${x}:${y}`) ?? 0;
						return value > 0
							? { value: [x, y, value] }
							: { value: [x, y, 0], itemStyle: { opacity: 0 } };
					})
				),
				animationDurationUpdate: reducedMotion ? 0 : 600
			};
		})
	};
}
