/**
 * The reports as participant care works through them: one case per reported chat, however many
 * reports it has, the one waiting longest first.
 */

export interface CaseReport {
	id: string;
	chatId: string;
	reason: string;
	createdAt: Date | string;
	reporterName?: string | null;
	reporterParticipantId?: string | null;
}

export interface ReportCase<R extends CaseReport> {
	chatId: string;
	/** The chat's open reports, the oldest first */
	reports: R[];
	/** When the first of them came in */
	since: Date;
}

const time = (report: CaseReport) => new Date(report.createdAt).getTime();

/** Groups open reports by their chat; the chat waiting longest comes first. */
export function reportCases<R extends CaseReport>(reports: readonly R[]): ReportCase<R>[] {
	const byChat = new Map<string, R[]>();
	for (const report of [...reports].sort((a, b) => time(a) - time(b))) {
		byChat.set(report.chatId, [...(byChat.get(report.chatId) ?? []), report]);
	}
	return [...byChat.entries()].flatMap(([chatId, own]) => {
		const [first] = own;
		return first ? [{ chatId, reports: own, since: new Date(first.createdAt) }] : [];
	});
}

const STEPS: readonly { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
	{ unit: 'day', seconds: 86_400 },
	{ unit: 'hour', seconds: 3_600 },
	{ unit: 'minute', seconds: 60 }
];

/** How long ago something came in, in the largest unit that fits ("2 hours ago"). */
export function waitingSince({ since, now, locale }: { since: Date; now: Date; locale: string }) {
	const seconds = Math.max(0, Math.round((now.getTime() - since.getTime()) / 1000));
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
	const step = STEPS.find((candidate) => seconds >= candidate.seconds);
	return step
		? format.format(-Math.floor(seconds / step.seconds), step.unit)
		: format.format(0, 'minute');
}
