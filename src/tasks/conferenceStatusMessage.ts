import { getLocale } from '$lib/paraglide/runtime';
import type { registrationReport } from '$api/services/statisticsData';

type RegistrationReport = Awaited<ReturnType<typeof registrationReport>>;
type RegistrationStatistics = RegistrationReport['registrationStatistics'];

function formatConferenceDate(date: Date) {
	return date.toLocaleDateString(getLocale(), {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}

/** The current count, followed by its change since the last report when there is one. */
export function formatHistoricComparison(historicStat: number | undefined, currentStat: number) {
	const diff = historicStat ? currentStat - historicStat : undefined;
	return historicStat && diff
		? `${currentStat} (${diff > 0 ? '+' : '-'}${Math.abs(diff)})`
		: `${currentStat}`;
}

type TextStyle = { bold?: boolean; code?: boolean };

/** A run of Slack rich text. */
const text = (content: string, style?: TextStyle) =>
	style ? { type: 'text', style, text: content } : { type: 'text', text: content };

/** One line of a rich text block. */
const line = (...elements: ReturnType<typeof text>[]) => ({
	type: 'rich_text_section',
	elements
});

/** A count set in code, compared with the previous report's. */
const count = (historic: number | undefined, current: number, bold = false) =>
	text(
		formatHistoricComparison(historic, current),
		bold ? { code: true, bold: true } : { code: true }
	);

const blankLine = line(text(' '));
const divider = { type: 'divider' };

/** The total, open and completed counts of one kind of registration, as three lines. */
function registrationLines(
	totalLabel: ReturnType<typeof text>,
	historic: { total: number; notApplied: number; applied: number } | undefined,
	current: { total: number; notApplied: number; applied: number },
	suffix: (key: 'total' | 'notApplied' | 'applied') => ReturnType<typeof text>[] = () => []
) {
	return [
		line(totalLabel, count(historic?.total, current.total, true), ...suffix('total')),
		line(
			text('Offene Anmeldungen: '),
			count(historic?.notApplied, current.notApplied),
			...suffix('notApplied')
		),
		line(
			text('Abgeschlossene Anmeldungen: '),
			count(historic?.applied, current.applied),
			...suffix('applied')
		)
	];
}

/** A conference date countdown, or what to say when the date is not set. */
const countdownLine = (date: Date | null, describe: (date: Date) => string, missing: string) =>
	line(text(date ? describe(date) : missing));

/**
 * The Slack blocks of one conference's status report: countdowns and registration numbers, each
 * compared with the previous report's (`hs`) when one was saved.
 */
export function conferenceStatusBlocks(
	conference: { title: string; startConference: Date | null; startAssignment: Date | null },
	countdowns: RegistrationReport['countdowns'],
	rs: RegistrationStatistics,
	hs: RegistrationStatistics | undefined
) {
	const delegationsOf = (key: 'total' | 'notApplied' | 'applied') => [
		text(' Teilnehmende in '),
		count(hs?.delegations[key], rs.delegations[key], key === 'total'),
		text(' Delegationen')
	];
	const roleLines = rs.singleParticipants.byRole.map((role) => {
		const hsRole = hs?.singleParticipants.byRole.find((entry) => entry.role === role.role);
		return line(
			text(`${role.role}: `),
			count(hsRole?.total, role.total, true),
			text('   |   '),
			count(hsRole?.notApplied, role.notApplied),
			text(' offen   |   '),
			count(hsRole?.applied, role.applied),
			text(' abgeschlossen')
		);
	});

	return [
		{
			type: 'header',
			text: { type: 'plain_text', text: `Konferenz-Update: ${conference.title}` }
		},
		{
			type: 'rich_text',
			elements: [
				countdownLine(
					conference.startConference,
					(date) =>
						`Noch ${countdowns.daysUntilConference} Tage bis zur Konferenz (Start am ${formatConferenceDate(date)})`,
					'Kein Konferenzdatum festgelegt'
				),
				countdownLine(
					conference.startAssignment,
					(date) =>
						`Anmeldung noch ${countdowns.daysUntilEndRegistration} Tage offen (bis ${formatConferenceDate(date)})`,
					'Kein Anmeldeschluss festgelegt'
				),
				blankLine,
				...registrationLines(text('Anmeldungen Gesamt: ', { bold: true }), hs, rs),
				blankLine
			]
		},
		divider,
		{
			type: 'rich_text',
			elements: [
				line(text('Delegationen', { bold: true })),
				...registrationLines(
					text('Gesamt: '),
					hs?.delegationMembers,
					rs.delegationMembers,
					delegationsOf
				),
				blankLine
			]
		},
		divider,
		{
			type: 'rich_text',
			elements: [
				line(text('Einzelbewerbungen', { bold: true })),
				...registrationLines(text('Gesamt: '), hs?.singleParticipants, rs.singleParticipants),
				blankLine,
				{ type: 'rich_text_list', elements: roleLines, style: 'bullet', border: 1 },
				blankLine
			]
		},
		divider,
		{
			type: 'rich_text',
			elements: [
				line(text('Betreuer*innen', { bold: true })),
				line(text('Angemeldete Betreuer*innen: '), count(hs?.supervisors, rs.supervisors, true)),
				blankLine
			]
		},
		divider
	];
}
