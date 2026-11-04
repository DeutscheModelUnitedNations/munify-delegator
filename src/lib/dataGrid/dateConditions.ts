import dayjs from 'dayjs';
import { dayBounds, isRelative, type Relative } from './operators';

/**
 * What a date condition means, worked out once for both engines: a span of calendar days (both
 * ends inclusive, either open), a month of any year, or emptiness. Relative operators ("in the last
 * 3 months") are resolved against `today` here, so the browser and the database agree on them.
 *
 * Days are `YYYY-MM-DD` strings, which compare like the days they name.
 */
export type DateTest =
	| { kind: 'span'; from?: string; to?: string }
	| { kind: 'month'; month: number }
	| { kind: 'empty' }
	| { kind: 'notEmpty' };

const FORMAT = 'YYYY-MM-DD';

/** Today as a day, in the local time of whoever asks. */
export function todayKey(now: Date = new Date()) {
	return dayjs(now).format(FORMAT);
}

const shift = ({ day, by }: { day: string; by: Relative & { sign: 1 | -1 } }) =>
	dayjs(day)
		.add(by.sign * by.amount, by.unit)
		.format(FORMAT);

const nextDay = (day: string, days: number) => dayjs(day).add(days, 'day').format(FORMAT);

type Resolve = (value: unknown, today: string) => DateTest | undefined;

const relative =
	(make: (relative: Relative, today: string) => DateTest): Resolve =>
	(value, today) =>
		isRelative(value) ? make(value, today) : undefined;

const RESOLVE: Record<string, Resolve> = {
	on: (value) => (typeof value === 'string' ? { kind: 'span', from: value, to: value } : undefined),
	before: (value) =>
		typeof value === 'string' ? { kind: 'span', to: nextDay(value, -1) } : undefined,
	after: (value) =>
		typeof value === 'string' ? { kind: 'span', from: nextDay(value, 1) } : undefined,
	between: (value) => ({ kind: 'span', ...dayBounds(value) }),
	inLast: relative((by, today) => ({
		kind: 'span',
		from: shift({ day: today, by: { ...by, sign: -1 } }),
		to: today
	})),
	inNext: relative((by, today) => ({
		kind: 'span',
		from: today,
		to: shift({ day: today, by: { ...by, sign: 1 } })
	})),
	olderThan: relative((by, today) => ({
		kind: 'span',
		to: nextDay(shift({ day: today, by: { ...by, sign: -1 } }), -1)
	})),
	thisYear: (_value, today) => yearSpan(Number(today.slice(0, 4))),
	lastYear: (_value, today) => yearSpan(Number(today.slice(0, 4)) - 1),
	thisMonth: (_value, today) => ({
		kind: 'span',
		from: `${today.slice(0, 7)}-01`,
		to: dayjs(today).endOf('month').format(FORMAT)
	}),
	month: (value) => (typeof value === 'number' ? { kind: 'month', month: value } : undefined),
	empty: () => ({ kind: 'empty' }),
	notEmpty: () => ({ kind: 'notEmpty' })
};

function yearSpan(year: number): DateTest {
	return { kind: 'span', from: `${year}-01-01`, to: `${year}-12-31` };
}

/** The test a complete date condition stands for; `undefined` for an unknown operator. */
export function dateTest({
	operator,
	value,
	today
}: {
	operator: string;
	value: unknown;
	today: string;
}): DateTest | undefined {
	return Object.hasOwn(RESOLVE, operator) ? RESOLVE[operator](value, today) : undefined;
}

/** A value as the day it falls on, or `null` when it is no day. */
export function dayOf(value: unknown): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	if (!(value instanceof Date) && typeof value !== 'string') return null;
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format(FORMAT) : null;
}

/** Whether a day passes a date test. */
export function dayPasses({ day, test }: { day: string | null; test: DateTest }) {
	switch (test.kind) {
		case 'empty':
			return day === null;
		case 'notEmpty':
			return day !== null;
		case 'month':
			return day !== null && Number(day.slice(5, 7)) === test.month;
		case 'span':
			return (
				day !== null &&
				(test.from === undefined || day >= test.from) &&
				(test.to === undefined || day <= test.to)
			);
	}
}
