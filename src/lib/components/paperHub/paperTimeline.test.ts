import { describe, expect, test } from 'vitest';
import {
	paperStatusWeeks,
	paperTimelineChart,
	weekStart,
	type TimelineCommittee,
	type TimelinePaper
} from './paperTimeline';

// Mondays of three weeks in a row, and a Wednesday in the third.
const week1 = '2026-03-02T00:00:00.000Z';
const week2 = '2026-03-09T00:00:00.000Z';
const week3 = '2026-03-16T00:00:00.000Z';
const now = new Date('2026-03-18T12:00:00.000Z');

const at = (monday: string, days: number) =>
	new Date(new Date(monday).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

function paper(versions: TimelinePaper['versions']): TimelinePaper {
	return { versions };
}

describe('weekStart', () => {
	test('is the Monday of the week, at midnight UTC', () => {
		expect(weekStart(new Date('2026-03-18T23:30:00.000Z')).toISOString()).toBe(week3);
		expect(weekStart(new Date('2026-03-22T10:00:00.000Z')).toISOString()).toBe(week3);
		expect(weekStart(new Date(week3)).toISOString()).toBe(week3);
	});
});

describe('paperStatusWeeks', () => {
	test('follows a paper from submission through review and revision', () => {
		const committees: TimelineCommittee[] = [
			{
				abbreviation: 'GA',
				papers: [
					paper([
						{
							createdAt: at(week1, 1),
							status: 'SUBMITTED',
							reviews: [{ createdAt: at(week2, 2), statusAfter: 'CHANGES_REQUESTED' }]
						},
						{
							createdAt: at(week3, 1),
							status: 'REVISED',
							reviews: []
						}
					])
				]
			}
		];
		const { weeks, cells } = paperStatusWeeks({ committees, now });
		expect(weeks.map((week) => week.toISOString())).toEqual([week1, week2, week3]);
		expect(cells).toEqual([
			{ committee: 0, week: 0, status: 'SUBMITTED', count: 1 },
			{ committee: 0, week: 1, status: 'CHANGES_REQUESTED', count: 1 },
			{ committee: 0, week: 2, status: 'REVISED', count: 1 }
		]);
	});

	test('counts a paper from its first version that is not a draft', () => {
		const committees: TimelineCommittee[] = [
			{
				abbreviation: 'SC',
				papers: [
					paper([
						{ createdAt: at(week1, 0), status: 'DRAFT', reviews: [] },
						{
							createdAt: at(week2, 3),
							status: 'SUBMITTED',
							reviews: [{ createdAt: at(week2, 4), statusAfter: 'ACCEPTED' }]
						}
					])
				]
			}
		];
		const { weeks, cells } = paperStatusWeeks({ committees, now });
		expect(weeks[0]?.toISOString()).toBe(week2);
		expect(cells).toEqual([
			{ committee: 0, week: 0, status: 'ACCEPTED', count: 1 },
			{ committee: 0, week: 1, status: 'ACCEPTED', count: 1 }
		]);
	});

	test('ignores reviews that changed no status and keeps only the last weeks', () => {
		const committees: TimelineCommittee[] = [
			{
				abbreviation: 'GA',
				papers: [
					paper([
						{
							createdAt: at(week1, 0),
							status: 'SUBMITTED',
							reviews: [{ createdAt: at(week2, 0), statusAfter: null }]
						}
					])
				]
			}
		];
		const { weeks, cells } = paperStatusWeeks({ committees, now, maxWeeks: 2 });
		expect(weeks.map((week) => week.toISOString())).toEqual([week2, week3]);
		expect(cells.map((cell) => cell.status)).toEqual(['SUBMITTED', 'SUBMITTED']);
	});

	test('has no weeks while nothing was handed in', () => {
		const committees: TimelineCommittee[] = [
			{
				abbreviation: 'GA',
				papers: [paper([{ createdAt: at(week1, 0), status: 'DRAFT', reviews: [] }])]
			}
		];
		expect(paperStatusWeeks({ committees, now })).toEqual({ weeks: [], cells: [] });
	});
});

describe('paperTimelineChart', () => {
	test('stacks one series per status and leaves out committees without papers', () => {
		const chart = paperTimelineChart({
			committees: [
				{ abbreviation: 'NSA', papers: [] },
				{
					abbreviation: 'GA',
					papers: [paper([{ createdAt: at(week3, 0), status: 'SUBMITTED', reviews: [] }])]
				}
			],
			now,
			labels: {
				week: (monday) => monday.toISOString().slice(0, 10),
				status: (status) => status,
				committees: 'Committees',
				weeks: 'Weeks',
				papers: 'Papers'
			},
			colors: { ACCEPTED: 'g', REVISED: 'b', SUBMITTED: 'y', CHANGES_REQUESTED: 'r' }
		});
		expect(chart.xLabels).toEqual(['GA']);
		expect(chart.yLabels).toEqual(['2026-03-16']);
		expect(chart.series.map((series) => [series.name, series.data])).toEqual([
			['ACCEPTED', []],
			['REVISED', []],
			['SUBMITTED', [{ x: 0, y: 0, value: 1 }]],
			['CHANGES_REQUESTED', []]
		]);
	});
});
