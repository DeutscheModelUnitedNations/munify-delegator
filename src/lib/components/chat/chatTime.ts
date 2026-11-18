import { m } from '#lib/paraglide/messages';

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** How many calendar days `date` lies before `now` (0 for today). */
function daysAgo({ date, now }: { date: Date; now: Date }) {
	return Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY);
}

/** When a chat last heard something, as a chat list says it: the time today, then the day. */
export function listTime({ date, now, locale }: { date: Date; now: Date; locale: string }) {
	const days = daysAgo({ date, now });
	if (days <= 0) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
	if (days === 1) return m.chatYesterday();
	if (days < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
	return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** The day a run of messages was written on, as the line between days says it. */
export function dayLabel({ date, now, locale }: { date: Date; now: Date; locale: string }) {
	const days = daysAgo({ date, now });
	if (days <= 0) return m.chatToday();
	if (days === 1) return m.chatYesterday();
	return date.toLocaleDateString(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
	});
}

/** The messages in the order they were written, each run of one day under its date. */
export function groupByDay<T extends { createdAt: Date | string }>(messages: readonly T[]) {
	const days: { day: Date; messages: T[] }[] = [];
	for (const message of messages) {
		const written = new Date(message.createdAt);
		const last = days.at(-1);
		if (last && startOfDay(last.day).getTime() === startOfDay(written).getTime()) {
			last.messages.push(message);
		} else {
			days.push({ day: written, messages: [message] });
		}
	}
	return days;
}
