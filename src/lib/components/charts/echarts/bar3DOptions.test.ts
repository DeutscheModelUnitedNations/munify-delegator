import { describe, expect, test } from 'vitest';
import { bar3DOptions, bar3DTooltip, type Bar3DChartData } from './bar3DOptions';

const theme = { textColor: '#111', backgroundColor: 'transparent', borderColor: '#222' };

const data: Bar3DChartData = {
	xLabels: ['GA', 'SC'],
	yLabels: ['W1', 'W2'],
	xName: 'Committee',
	yName: 'Week',
	zName: 'Papers',
	series: [
		{ name: 'Accepted', color: 'green', data: [{ x: 1, y: 0, value: 2 }] },
		{ name: 'Open', color: 'yellow', data: [{ x: 0, y: 1, value: 3 }] }
	]
};

describe('bar3DOptions', () => {
	test('lists the whole grid in the same order in every series, empty cells invisible', () => {
		const { series } = bar3DOptions({ data, theme, reducedMotion: false });
		const cells = series.map((layer) => layer.data.map((item) => item.value.slice(0, 2)));
		expect(cells[0]).toEqual([
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1]
		]);
		expect(cells[1]).toEqual(cells[0]);
		expect(series[0]?.data[2]).toEqual({ value: [1, 0, 2] });
		expect(series[0]?.data[0]).toEqual({ value: [0, 0, 0], itemStyle: { opacity: 0 } });
		expect(series.every((layer) => layer.stack === 'total')).toBe(true);
	});

	test('names the axes, labels every category and colours them with the theme', () => {
		const options = bar3DOptions({ data, theme, reducedMotion: false });
		expect(options.xAxis3D).toMatchObject({
			type: 'category',
			name: 'Committee',
			data: ['GA', 'SC'],
			axisLabel: { interval: 0, textStyle: { color: '#111' } }
		});
		expect(options.zAxis3D).toMatchObject({ type: 'value', name: 'Papers', minInterval: 1 });
		expect(options.legend.data).toEqual(['Accepted', 'Open']);
	});

	test('keeps the camera and the bars still for reduced motion', () => {
		const still = bar3DOptions({ data, theme, reducedMotion: true });
		expect(still.grid3D.viewControl.autoRotate).toBe(false);
		expect(still.series[0]?.animationDurationUpdate).toBe(0);
		expect(bar3DOptions({ data, theme, reducedMotion: false }).grid3D.viewControl.autoRotate).toBe(
			true
		);
	});
});

describe('bar3DTooltip', () => {
	const labels = { xLabels: ['GA', 'SC'], yLabels: ['W1', 'W2'] };

	test('names the cell, the layer and the value', () => {
		expect(bar3DTooltip({ params: { seriesName: 'Open', value: [1, 0, 3] }, ...labels })).toBe(
			'SC · W1<br/>Open: <b>3</b>'
		);
	});

	test('is empty for invisible empty cells and unexpected values', () => {
		expect(bar3DTooltip({ params: { seriesName: 'Open', value: [1, 0, 0] }, ...labels })).toBe('');
		expect(bar3DTooltip({ params: { value: 'x' }, ...labels })).toBe('');
	});
});
