import type * as schema from '../schema';
import { sitePlanPdf } from '../seed-data/pdfDocuments';
import { PERSONA_NATION } from './conference';
import type { ConferenceSeed } from './context';
import { addSeedFile } from './files';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Audience = Omit<typeof schema.announcementAudience.$inferInsert, 'announcementId'>;
type Row = Omit<typeof schema.announcement.$inferInsert, 'id' | 'conferenceId' | 'authorId'>;

/**
 * The announcements (see "Announcements" in CLAUDE.md), written by `dev-team-care` in every
 * conference the dev team is on, in every state the team's list tells apart: published, a draft,
 * scheduled, expired and archived. Each conference has a pinned one for everybody (edited after it
 * went out, so readers see "updated"), one for the team and one for the waiting list; while
 * people register one for the applicants. The ones with seats add one per remaining audience kind
 * (a committee, a role, a survey choice, supervisors, open payment and paperwork, minors, adults,
 * a team role) and one with two attachments whose mail went out again. The running conference
 * has an urgent one, which shows as the bar across its pages until it is read.
 *
 * The welcome is read by the personas and a part of the crowd, the team briefing by part of the
 * team; everything else is unread, so the feed and the bar have something to show. Mails are
 * only owed for 24 hours from `mailSince`: the ones here are older or still ahead, so a sweep
 * does not mail the crowd.
 */
export async function addAnnouncements(cs: ConferenceSeed) {
	if (cs.plan.key === 'elsewhere') return;
	const now = Date.now();
	const out = (hoursAgo: number) => ({
		status: 'PUBLISHED' as const,
		publishAt: new Date(now - hoursAgo * HOUR),
		releaseAnnounced: true,
		publishedById: 'dev-team-care'
	});

	const add = ({
		key,
		row,
		audiences,
		readBy = []
	}: {
		key: string;
		row: Row;
		audiences: Audience[];
		readBy?: string[];
	}) => {
		const id = cs.rowId(`announcement-${key}`);
		cs.batch.announcement.push({ ...row, id, conferenceId: cs.id, authorId: 'dev-team-care' });
		for (const audience of audiences)
			cs.batch.announcementAudience.push({ ...audience, announcementId: id });
		for (const userId of new Set(readBy))
			cs.batch.announcementRead.push({ announcementId: id, userId });
		return id;
	};

	const personaReaders = cs.plan.assigned
		? ['dev-head-delegate', 'dev-delegate', 'dev-single', 'dev-supervisor']
		: ['dev-reg-head-applied', 'dev-reg-single-applied'];
	const crowdReaders = cs.acceptedUsers.filter((_, index) => index % 3 === 0);

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
			signature: 'Euer Team der Teilnehmendenbetreuung',
			editedAt: cs.plan.key === 'pre' ? null : new Date(now - 24 * HOUR)
		},
		audiences: [{ kind: 'EVERYONE' }],
		readBy: cs.plan.key === 'pre' ? [] : [...personaReaders, ...crowdReaders]
	});
	add({
		key: 'team',
		row: {
			...out(20),
			title: 'Teambriefing',
			body: 'Wir treffen uns am Vorabend um 19 Uhr zum Briefing. Bitte lest vorher das Teamwiki.'
		},
		audiences: [{ kind: 'TEAM' }],
		readBy: ['dev-team-pm', 'dev-team-coordinator']
	});
	add({
		key: 'draft',
		row: {
			title: 'Abreise (Entwurf)',
			body: 'Die Zimmer sind bis 10 Uhr zu räumen. Gepäck kann im Tagungsbüro bleiben.'
		},
		audiences: [{ kind: 'SEATED' }]
	});
	add({
		key: 'archived',
		row: {
			...out(10 * 24),
			status: 'ARCHIVED',
			title: 'Neue Website',
			body: 'Unsere Website ist umgezogen. Die alten Links funktionieren nicht mehr.'
		},
		audiences: [{ kind: 'EVERYONE' }]
	});
	add({
		key: 'expired',
		row: {
			...out(5 * 24),
			title: 'Sprechstunde am Mittwoch',
			body: 'Am Mittwoch beantworten wir von 18 bis 19 Uhr eure Fragen im Videocall.',
			visibleUntil: new Date(now - DAY)
		},
		audiences: [{ kind: 'EVERYONE' }]
	});
	if (cs.plan.key === 'pre') return;

	add({
		key: 'waiting-list',
		row: {
			...out(48),
			title: 'Hinweis für die Warteliste',
			body: 'Sobald Plätze frei werden, rücken Personen von der Warteliste nach. Ihr bekommt dann eine Mail.'
		},
		audiences: [{ kind: 'WAITING_LIST' }]
	});
	if (!cs.plan.assigned) {
		add({
			key: 'applicants',
			row: {
				...out(36),
				title: 'Bewerbung vervollständigen',
				body: 'Denkt daran, eure Bewerbung vor dem Anmeldeschluss **abzuschicken**. Entwürfe werden nicht berücksichtigt.',
				importance: 'IMPORTANT'
			},
			audiences: [{ kind: 'APPLICANTS' }]
		});
		return;
	}

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
	add({
		key: 'germany',
		row: {
			...out(16),
			title: 'An die Delegation Deutschlands',
			body: 'Bitte meldet euch vor der Eröffnung kurz beim Sekretariat, wir haben eine Frage zu eurer Sitzordnung.'
		},
		audiences: [{ kind: 'ROLE', roleId: cs.nationRoleId(PERSONA_NATION) }]
	});
	add({
		key: 'paperwork',
		row: {
			...out(40),
			title: 'Unterlagen fehlen noch',
			body: 'Bei dir fehlen noch Unterlagen. Lade sie bitte bis zum Ende der Woche hoch oder schick sie per Post.',
			importance: 'IMPORTANT'
		},
		audiences: [{ kind: 'PAPERWORK_OPEN' }]
	});
	add({
		key: 'minors',
		row: {
			...out(26),
			title: 'Nachtruhe für Minderjährige',
			body: 'Für alle unter 18 gilt ab 23 Uhr Nachtruhe in der Unterkunft.'
		},
		audiences: [{ kind: 'MINORS' }, { kind: 'SUPERVISORS' }]
	});
	add({
		key: 'adults',
		row: {
			...out(26),
			title: 'Abendprogramm ab 18',
			body: 'Der Ausklang im Club am Freitag ist für alle ab 18. Bringt bitte euren Ausweis mit.'
		},
		audiences: [{ kind: 'ADULTS' }]
	});
	const workshopOption = cs.batch.surveyOption.find(
		(option) => option.questionId === cs.rowId('survey-workshop') && option.title === 'Rhetorik'
	);
	if (workshopOption?.id)
		add({
			key: 'workshop',
			row: {
				...out(8),
				title: 'Workshop Rhetorik: Raum geändert',
				body: 'Der Rhetorik-Workshop findet in Raum 2.14 statt.'
			},
			audiences: [{ kind: 'SURVEY_OPTION', surveyOptionId: workshopOption.id }]
		});
	const travelId = add({
		key: 'travel',
		row: {
			...out(5 * 24),
			title: 'Anreise und Lagepläne',
			body: 'Im Anhang findet ihr die Lagepläne von Tagungshaus und Unterkunft.\n\nWir haben die Pläne aktualisiert und euch deshalb noch einmal benachrichtigt.',
			signature: 'Eure Logistik',
			notifyByMail: true,
			mailRevision: 1,
			mailSince: new Date(now - 40 * HOUR)
		},
		audiences: [{ kind: 'DELEGATES' }, { kind: 'SINGLE_PARTICIPANTS' }]
	});
	for (const [position, [venue, rooms]] of (
		[
			['Tagungshaus', ['Plenarsaal', 'Raum 2.14', 'Tagungsbüro']],
			['Unterkunft', ['Rezeption', 'Speisesaal']]
		] as const
	).entries()) {
		const fileId = addSeedFile({
			batch: cs.batch,
			file: {
				conferenceId: cs.id,
				kind: 'announcement',
				field: 'attachment',
				bytes: await sitePlanPdf({ venue, rooms: [...rooms] }),
				mimeType: 'application/pdf',
				fileName: `Lageplan ${venue}.pdf`
			}
		});
		cs.batch.announcementAttachment.push({ announcementId: travelId, fileId, position });
	}
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
