import type * as schema from '../schema';
import type { ConferenceSeed } from './context';

const HOUR = 60 * 60 * 1000;

type Audience = Omit<typeof schema.announcementAudience.$inferInsert, 'announcementId'>;
type Row = Omit<typeof schema.announcement.$inferInsert, 'id' | 'conferenceId' | 'authorId'>;

/**
 * The announcements (see "Announcements" in CLAUDE.md), written by `dev-team-care` in every
 * conference the dev team is on. Each has a pinned one for everybody; the ones with seats also
 * have one for the first committee (important), one for supervisors, one for the team, one for
 * whoever still owes the payment, a draft and a scheduled one; the running conference has an
 * urgent one, which shows as the bar across its pages until it is read. Nothing is read yet.
 */
export function addAnnouncements(cs: ConferenceSeed) {
	if (cs.plan.key === 'elsewhere') return;
	const now = Date.now();
	const out = (hoursAgo: number) => ({
		status: 'PUBLISHED' as const,
		publishAt: new Date(now - hoursAgo * HOUR),
		releaseAnnounced: true,
		publishedById: 'dev-team-care'
	});

	const add = ({ key, row, audiences }: { key: string; row: Row; audiences: Audience[] }) => {
		const id = cs.rowId(`announcement-${key}`);
		cs.batch.announcement.push({ ...row, id, conferenceId: cs.id, authorId: 'dev-team-care' });
		for (const audience of audiences)
			cs.batch.announcementAudience.push({ ...audience, announcementId: id });
	};

	add({
		key: 'welcome',
		row: {
			...out(72),
			title: 'Willkommen',
			body:
				cs.plan.key === 'pre'
					? 'Die Bewerbung öffnet bald. Schaut gern wieder vorbei.'
					: 'Schön, dass ihr dabei seid! Hier findet ihr alles **Wichtige** rund um die Konferenz.\n\n- Fragen beantwortet die Teilnehmendenbetreuung\n- Neuigkeiten erscheinen an dieser Stelle',
			pinned: true,
			signature: 'Euer Team der Teilnehmendenbetreuung'
		},
		audiences: [{ kind: 'EVERYONE' }]
	});
	add({
		key: 'team',
		row: {
			...out(20),
			title: 'Teambriefing',
			body: 'Wir treffen uns am Vorabend um 19 Uhr zum Briefing. Bitte lest vorher das Teamwiki.'
		},
		audiences: [{ kind: 'TEAM' }]
	});
	add({
		key: 'draft',
		row: {
			title: 'Abreise (Entwurf)',
			body: 'Die Zimmer sind bis 10 Uhr zu räumen. Gepäck kann im Tagungsbüro bleiben.'
		},
		audiences: [{ kind: 'SEATED' }]
	});
	if (!cs.plan.assigned) return;

	const [first] = cs.committees;
	if (first)
		add({
			key: 'committee',
			row: {
				...out(6),
				title: `Raumwechsel ${first.abbreviation}`,
				body: `Das Gremium ${first.abbreviation} tagt ab morgen im Plenarsaal im Erdgeschoss.`,
				importance: 'IMPORTANT'
			},
			audiences: [{ kind: 'COMMITTEE', committeeId: first.id }]
		});
	add({
		key: 'supervisors',
		row: {
			...out(30),
			title: 'Hinweise für Betreuende',
			body: 'Bitte bestätigt bis Freitag, ob ihr selbst zur Konferenz kommt.',
			notifyByMail: true,
			mailSince: new Date(now - 30 * HOUR)
		},
		audiences: [{ kind: 'SUPERVISORS' }, { kind: 'TEAM', teamRole: 'PARTICIPANT_CARE' }]
	});
	add({
		key: 'payment',
		row: {
			...out(12),
			title: 'Erinnerung: Teilnahmebeitrag',
			body: 'Bei dir ist noch kein Zahlungseingang vermerkt. Bitte überweise den Beitrag in den nächsten Tagen.'
		},
		audiences: [{ kind: 'PAYMENT_OPEN' }]
	});
	add({
		key: 'scheduled',
		row: {
			title: 'Programm am Samstagabend',
			body: 'Am Samstag findet ab 20 Uhr der Delegiertenball statt.',
			status: 'PUBLISHED',
			publishAt: new Date(now + 48 * HOUR),
			mailSince: new Date(now + 48 * HOUR),
			notifyByMail: true,
			publishedById: 'dev-team-care'
		},
		audiences: [{ kind: 'SEATED' }]
	});
	if (cs.plan.key === 'active')
		add({
			key: 'urgent',
			row: {
				...out(1),
				title: 'Feueralarm-Probe um 15 Uhr',
				body: 'Um 15 Uhr wird der Feueralarm getestet. Es ist **keine** Räumung nötig.',
				importance: 'URGENT',
				visibleUntil: new Date(now + 12 * HOUR)
			},
			audiences: [{ kind: 'EVERYONE' }, { kind: 'TEAM' }]
		});
}
