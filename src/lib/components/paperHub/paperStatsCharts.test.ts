import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { committeeTooltip, paperTypeChartColors, paperTypeLabel } from './paperStatsCharts';

function point(seriesName: string, value: number | string) {
	return {
		componentType: 'series',
		componentSubType: 'bar',
		componentIndex: 0,
		seriesName,
		name: 'GA',
		dataIndex: 0,
		data: value,
		value,
		color: '#000',
		marker: '*',
		axisValue: 'GA',
		$vars: []
	};
}

describe('paper type labels and colors', () => {
	test('every type has a label and color', () => {
		expect(paperTypeLabel('POSITION_PAPER')).toBe(m.paperTypePositionPaper());
		expect(paperTypeLabel('WORKING_PAPER')).toBe(m.paperTypeWorkingPaper());
		expect(paperTypeLabel('INTRODUCTION_PAPER')).toBe(m.paperTypeIntroductionPaper());
		expect(paperTypeChartColors.INTRODUCTION_PAPER).toBe('#f59e0b');
	});
});

describe('committeeTooltip', () => {
	test('nothing for a single point or an empty list', () => {
		expect(committeeTooltip(point('PP - Accepted', 1), ['PP'])).toBe('');
		expect(committeeTooltip([], ['PP'])).toBe('');
	});

	test('lists each type with papers, and its non-empty statuses', () => {
		const tooltip = committeeTooltip(
			[
				point('PP - Submitted', 2),
				point('PP - Accepted', 0),
				point('PP - Revised', 'x'),
				point('WP - Submitted', 0)
			],
			['PP', 'WP']
		);
		expect(tooltip).toBe(
			'<strong>GA</strong><br/><br/><strong>PP: 2</strong><br/>* Submitted: 2<br/>'
		);
	});

	test('a point without a category', () => {
		const { axisValue, ...withoutAxis } = point('PP - Submitted', 1);
		expect(axisValue).toBe('GA');
		expect(committeeTooltip([withoutAxis], ['PP'])).toBe(
			'<strong>undefined</strong><br/><br/><strong>PP: 1</strong><br/>* Submitted: 1<br/>'
		);
	});
});
