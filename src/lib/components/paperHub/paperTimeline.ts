import type { PaperstatusEnum } from '#lib/api/rumbleClient/client';
import type { Bar3DChartData } from '#lib/components/charts/echarts/bar3DOptions';

/**
 * Where the papers of each committee stood week by week, rebuilt from their history: a version
 * sets the paper to its status when it is handed in, a review to the status it left behind. A
 * paper counts from its first version that is not a draft.
 */

type When = Date | string;

export interface TimelinePaper {
	versions: Array<{
		createdAt: When;
		status: PaperstatusEnum;
		reviews: Array<{ createdAt: When; statusAfter?: PaperstatusEnum | null }>;
	}>;
}

export interface TimelineCommittee {
	abbreviation: string;
	papers: TimelinePaper[];
}

/** The statuses the chart stacks, bottom up; drafts are not handed in yet and do not show. */
export const TIMELINE_STATUSES = ['ACCEPTED', 'REVISED', 'SUBMITTED', 'CHANGES_REQUESTED'] as const;
export type TimelineStatus = (typeof TIMELINE_STATUSES)[number];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The Monday (00:00 UTC) of the week `date` falls in. */
export function weekStart(date: Date) {
	const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const sinceMonday = (day.getUTCDay() + 6) % 7;
	return new Date(day.getTime() - sinceMonday * 24 * 60 * 60 * 1000);
}

function isTimelineStatus(status: PaperstatusEnum): status is TimelineStatus {
	return status !== 'DRAFT';
}

/** A paper's status changes, oldest first. */
function statusChanges(paper: TimelinePaper) {
	return paper.versions
		.flatMap((version) => [
			{ at: new Date(version.createdAt).getTime(), status: version.status },
			...version.reviews.flatMap((review) =>
				review.statusAfter
					? [{ at: new Date(review.createdAt).getTime(), status: review.statusAfter }]
					: []
			)
		])
		.toSorted((a, b) => a.at - b.at);
}

/** The paper's status at `at`; undefined before it was handed in or while it is a draft. */
function statusAt({
	changes,
	at
}: {
	changes: ReturnType<typeof statusChanges>;
	at: number;
}): TimelineStatus | undefined {
	let current: PaperstatusEnum | undefined;
	for (const change of changes) {
		if (change.at > at) break;
		current = change.status;
	}
	return current && isTimelineStatus(current) ? current : undefined;
}

/**
 * The weeks from the first paper handed in up to `now` (the last `maxWeeks` of them), and per
 * committee, week and status how many papers stood there at the end of the week (or now, for
 * the running week).
 */
export function paperStatusWeeks({
	committees,
	now,
	maxWeeks = 20
}: {
	committees: TimelineCommittee[];
	now: Date;
	maxWeeks?: number;
}) {
	const histories = committees.map((committee) => committee.papers.map(statusChanges));
	const handedIn = histories
		.flat(2)
		.filter((change) => isTimelineStatus(change.status))
		.map((change) => change.at);
	if (handedIn.length === 0) return { weeks: [], cells: [] };

	const first = weekStart(new Date(Math.min(...handedIn))).getTime();
	const last = weekStart(now).getTime();
	const weekCount = Math.min(maxWeeks, Math.floor((last - first) / WEEK_MS) + 1);
	const weeks = Array.from(
		{ length: weekCount },
		(_, index) => new Date(last - (weekCount - 1 - index) * WEEK_MS)
	);

	const cells: Array<{ committee: number; week: number; status: TimelineStatus; count: number }> =
		[];
	histories.forEach((papers, committee) => {
		weeks.forEach((week, weekIndex) => {
			const at = Math.min(week.getTime() + WEEK_MS - 1, now.getTime());
			const counts = new Map<TimelineStatus, number>();
			for (const changes of papers) {
				const status = statusAt({ changes, at });
				if (status) counts.set(status, (counts.get(status) ?? 0) + 1);
			}
			for (const [status, count] of counts)
				cells.push({ committee, week: weekIndex, status, count });
		});
	});
	return { weeks, cells };
}

/** The timeline as a 3D chart: committees along the front, weeks going back, statuses stacked. */
export function paperTimelineChart({
	committees,
	now,
	labels,
	colors
}: {
	committees: TimelineCommittee[];
	now: Date;
	labels: {
		week: (monday: Date) => string;
		status: (status: TimelineStatus) => string;
		committees: string;
		weeks: string;
		papers: string;
	};
	colors: Record<TimelineStatus, string>;
}): Bar3DChartData {
	// Committees with papers only; the introduction papers of non-state actors have none.
	const shown = committees.filter((committee) => committee.papers.length > 0);
	const { weeks, cells } = paperStatusWeeks({ committees: shown, now });
	return {
		xLabels: shown.map((committee) => committee.abbreviation),
		yLabels: weeks.map(labels.week),
		xName: labels.committees,
		yName: labels.weeks,
		zName: labels.papers,
		series: TIMELINE_STATUSES.map((status) => ({
			name: labels.status(status),
			color: colors[status],
			data: cells
				.filter((cell) => cell.status === status)
				.map((cell) => ({ x: cell.committee, y: cell.week, value: cell.count }))
		}))
	};
}
