import { describe, expect, test } from 'vitest';
import type { DefaultLabelFormatterCallbackParams } from 'echarts';
import {
	barChartOptions,
	chartTitle,
	lineChartOptions,
	multiSeriesBarChartOptions,
	multiSeriesPalette,
	percentOf,
	pieChartOptions,
	positiveValueLabel,
	stackedBarTooltip,
	themedChartOptions
} from './chartOptions';

const theme = { textColor: '#111', backgroundColor: 'transparent', borderColor: '#222' };

function seriesOf(options: ReturnType<typeof barChartOptions>) {
	return Array.isArray(options.series) ? options.series : [];
}

describe('chartTitle', () => {
	test('centers a given title', () => {
		expect(chartTitle('Hello')).toEqual({ text: 'Hello', left: 'center', top: 10 });
	});
	test('is undefined without a title', () => {
		expect(chartTitle(undefined)).toBeUndefined();
		expect(chartTitle('')).toBeUndefined();
	});
});

describe('themedChartOptions', () => {
	test('fills in palette, background and text color', () => {
		const result = themedChartOptions({}, theme, ['#abc']);
		expect(result.color).toEqual(['#abc']);
		expect(result.backgroundColor).toBe('transparent');
		expect(result.textStyle).toEqual({ color: '#111' });
	});
	test('keeps what the options set themselves', () => {
		const result = themedChartOptions(
			{ color: ['#fff'], backgroundColor: '#000', textStyle: { color: '#f00', fontSize: 3 } },
			theme,
			['#abc']
		);
		expect(result.color).toEqual(['#fff']);
		expect(result.backgroundColor).toBe('#000');
		expect(result.textStyle).toEqual({ color: '#f00', fontSize: 3 });
	});
});

describe('barChartOptions', () => {
	const base = {
		labels: ['a', 'b'],
		values: [1, 2],
		horizontal: false,
		showValues: true,
		xAxisName: 'x',
		yAxisName: 'y'
	};

	test('vertical: categories on x, rounded top corners, labels on top', () => {
		const options = barChartOptions(base);
		expect(options.xAxis).toMatchObject({ type: 'category', name: 'x', data: ['a', 'b'] });
		expect(options.yAxis).toMatchObject({ type: 'value', name: 'y' });
		expect(options.title).toBeUndefined();
		expect(options.grid).toMatchObject({ top: 20 });
		expect(seriesOf(options)[0]).toMatchObject({
			itemStyle: { borderRadius: [4, 4, 0, 0] },
			label: { show: true, position: 'top' }
		});
	});

	test('vertical with many labels rotates them', () => {
		const labels = Array.from({ length: 9 }, (_, i) => `l${i}`);
		expect(barChartOptions({ ...base, labels }).xAxis).toMatchObject({
			axisLabel: { rotate: 45 }
		});
	});

	test('horizontal: categories on y, axis names swap, labels on the right', () => {
		const labels = Array.from({ length: 9 }, (_, i) => `l${i}`);
		const options = barChartOptions({ ...base, labels, horizontal: true, title: 'T' });
		expect(options.yAxis).toMatchObject({ type: 'category', name: 'y', axisLabel: { rotate: 0 } });
		expect(options.xAxis).toMatchObject({ type: 'value', name: 'x' });
		expect(options.grid).toMatchObject({ top: 50 });
		expect(options.title).toMatchObject({ text: 'T' });
		expect(seriesOf(options)[0]).toMatchObject({
			itemStyle: { borderRadius: [0, 4, 4, 0] },
			label: { position: 'right' }
		});
	});

	test('a color replaces the rounded corners; values can be hidden', () => {
		const series = seriesOf(barChartOptions({ ...base, color: '#123', showValues: false }))[0];
		expect(series).toMatchObject({ itemStyle: { color: '#123' } });
		expect(series).toHaveProperty('label', undefined);
	});
});

describe('lineChartOptions', () => {
	test('applies legend, title and smoothing defaults', () => {
		const options = lineChartOptions({
			xAxisData: ['a'],
			series: [
				{ name: 's1', data: [1] },
				{ name: 's2', data: [2], smooth: false, areaStyle: true }
			],
			title: 'T',
			showLegend: true,
			smooth: true
		});
		expect(options.legend).toEqual({ bottom: 10, type: 'scroll' });
		expect(options.grid).toMatchObject({ bottom: 50, top: 60 });
		expect(options.xAxis).toMatchObject({ axisLabel: { rotate: 0 } });
		const series = seriesOf(options);
		expect(series[0]).toMatchObject({ smooth: true, areaStyle: undefined });
		expect(series[1]).toMatchObject({ smooth: false, areaStyle: { opacity: 0.3 } });
	});

	test('without legend or title, and rotating many labels', () => {
		const options = lineChartOptions({
			xAxisData: Array.from({ length: 11 }, (_, i) => `${i}`),
			series: [],
			showLegend: false,
			smooth: false
		});
		expect(options.legend).toBeUndefined();
		expect(options.grid).toMatchObject({ bottom: 30, top: 30 });
		expect(options.xAxis).toMatchObject({ axisLabel: { rotate: 45 } });
	});
});

describe('multiSeriesBarChartOptions', () => {
	test('stacked with values and legend', () => {
		const options = multiSeriesBarChartOptions({
			labels: ['a'],
			series: [
				{ name: 's1', data: [1] },
				{ name: 's2', data: [2], color: '#999' }
			],
			title: 'T',
			showValues: true,
			stacked: true,
			showLegend: true
		});
		expect(options.legend).toMatchObject({ data: ['s1', 's2'] });
		expect(options.grid).toMatchObject({ bottom: 40, top: 50 });
		const series = seriesOf(options);
		expect(series[0]).toMatchObject({
			stack: 'total',
			itemStyle: { color: multiSeriesPalette[0], borderRadius: undefined },
			label: { show: true, position: 'inside' }
		});
		expect(series[1]).toMatchObject({ itemStyle: { color: '#999' } });
	});

	test('grouped without values or legend; palette cycles', () => {
		const series = Array.from({ length: 9 }, (_, i) => ({ name: `s${i}`, data: [i] }));
		const options = multiSeriesBarChartOptions({
			labels: Array.from({ length: 13 }, (_, i) => `${i}`),
			series,
			showValues: false,
			stacked: false,
			showLegend: false
		});
		expect(options.legend).toBeUndefined();
		expect(options.grid).toMatchObject({ bottom: 30, top: 20 });
		expect(options.xAxis).toMatchObject({ axisLabel: { rotate: 45 } });
		const built = seriesOf(options);
		expect(built[0]).toMatchObject({
			stack: undefined,
			label: undefined,
			itemStyle: { borderRadius: [4, 4, 0, 0] }
		});
		expect(built[8]).toMatchObject({ itemStyle: { color: multiSeriesPalette[0] } });
	});
});

describe('positiveValueLabel', () => {
	const params = (value: DefaultLabelFormatterCallbackParams['value']) => ({
		componentType: 'series',
		componentSubType: 'bar',
		componentIndex: 0,
		name: '',
		dataIndex: 0,
		data: value,
		value,
		color: '#000',
		$vars: []
	});
	test('shows positive numbers only', () => {
		expect(positiveValueLabel(params(3))).toBe('3');
		expect(positiveValueLabel(params(0))).toBe('');
		expect(positiveValueLabel(params('3'))).toBe('');
	});
});

describe('pieChartOptions', () => {
	test('labels default to hidden when the legend is shown', () => {
		const options = pieChartOptions({ data: [], donut: false, showLegend: true });
		expect(options.legend).toMatchObject({ orient: 'horizontal' });
		expect(seriesOf(options)[0]).toMatchObject({
			radius: '60%',
			center: ['50%', '45%'],
			label: { show: false },
			labelLine: { show: false }
		});
	});

	test('donut without legend shows labels unless told otherwise', () => {
		const options = pieChartOptions({ data: [], donut: true, showLegend: false, title: 'T' });
		expect(options.legend).toBeUndefined();
		expect(options.title).toMatchObject({ text: 'T' });
		expect(seriesOf(options)[0]).toMatchObject({
			radius: ['35%', '60%'],
			center: ['50%', '50%'],
			label: { show: true }
		});
		const hidden = pieChartOptions({ data: [], donut: true, showLegend: false, showLabels: false });
		expect(seriesOf(hidden)[0]).toMatchObject({ label: { show: false } });
	});
});

describe('percentOf', () => {
	test('rounds a share and guards an empty total', () => {
		expect(percentOf(1, 3)).toBe(33);
		expect(percentOf(5, 0)).toBe(0);
	});
});

describe('stackedBarTooltip', () => {
	const point = (value: number | string) => ({
		componentType: 'series',
		componentSubType: 'bar',
		componentIndex: 0,
		seriesName: 'Paid',
		name: '',
		dataIndex: 0,
		data: value,
		value,
		color: '#000',
		$vars: []
	});

	test('describes a single point', () => {
		expect(stackedBarTooltip(point(1), 4)).toBe('Paid: 1 (25%)');
	});
	test('takes the first of an array and treats non-numbers as 0', () => {
		expect(stackedBarTooltip([point('x')], 4)).toBe('Paid: 0 (0%)');
	});
	test('handles an empty array', () => {
		expect(stackedBarTooltip([], 0)).toBe('undefined: 0 (0%)');
	});
});
