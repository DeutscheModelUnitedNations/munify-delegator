import type * as schema from '../schema';
import type { Outline } from '#lib/guide/outline';
import type { GuideDocument, GuideNode } from '#lib/guide/document';
import type { ConferenceSeed } from './context';
import type { SeedBatch } from './batch';

/**
 * The preparation guide (`docs/plans/guide.md`): two series, pages shared everywhere and by the
 * series, and per conference a sidebar with every audience - the committee template (a page per
 * committee and agenda item), non-state actors, a custom role, supervisors - and pages of its own.
 * The conferences with released roles publish it (`guidePublished`), but the locked preparation,
 * which keeps the old external link; the others show it to the team only.
 */

export const SEED_SERIES = { sh: 'seed-series-sh', bw: 'seed-series-bw' } as const;

type Page = typeof schema.guidePage.$inferInsert;

const text = (value: string): GuideNode => ({ type: 'text', text: value });
const paragraph = (value: string): GuideNode => ({ type: 'paragraph', content: [text(value)] });
const heading = (value: string, level = 2): GuideNode => ({
	type: 'heading',
	attrs: { level },
	content: [text(value)]
});
const doc = (...content: GuideNode[]): GuideDocument => ({ type: 'doc', content });

/**
 * An agenda item page. The first topic has points for discussion (`conference.ts`): the first
 * committee places them with `{{Diskussionspunkte}}`, the others get them below the title. The
 * second topic has none and lists them in its text, as pages taken over from the old guide do.
 */
function agendaItemPageContent({
	index,
	committeeIndex
}: {
	index: number;
	committeeIndex: number;
}) {
	const summary = [heading('Zusammenfassung'), paragraph('Worum es bei diesem Thema geht.')];
	if (index === 0) {
		return committeeIndex === 0
			? [
					...summary,
					paragraph('{{Diskussionspunkte}}'),
					heading('Hintergrund'),
					paragraph('Was bisher geschah.')
				]
			: [...summary, heading('Hintergrund'), paragraph('Was bisher geschah.')];
	}
	return [
		...summary,
		heading('Punkte zur Diskussion'),
		{
			type: 'bulletList',
			content: [
				{ type: 'listItem', content: [paragraph('Welche Lösungen gibt es?')] },
				{ type: 'listItem', content: [paragraph('Wer trägt die Kosten?')] }
			]
		}
	];
}

/** The shared pages: written once, published, reaching every conference of a series. */
const SHARED_PAGES: { id: string; title: string; content: GuideDocument; series?: boolean }[] = [
	{
		id: 'seed-guide-why',
		title: 'Warum vorbereiten?',
		content: doc(
			paragraph(
				'Eine gute Vorbereitung ist der Schlüssel zu einer gelungenen Konferenz bei {{Konferenz}}.'
			),
			heading('Was dich erwartet'),
			paragraph('In diesem Leitfaden findest du alle Schritte, Schritt für Schritt.'),
			{
				type: 'callout',
				attrs: { icon: 'question', color: 'info' },
				content: [paragraph('Fragen? Schreib dem Team über die Nachrichten.')]
			}
		)
	},
	{
		id: 'seed-guide-role',
		title: 'Schritt 1: Meine Rolle als Delegierte*r',
		content: doc(
			paragraph('Als Delegierte*r im {{Gremium}} vertrittst du dein Land.'),
			heading('Die Themen'),
			paragraph('{{Themen}}'),
			{
				type: 'toggle',
				attrs: { summary: 'Was heißt „vertreten“?' },
				content: [paragraph('Du sprichst für die Regierung deines Landes, nicht für dich.')]
			}
		)
	},
	{
		id: 'seed-guide-paper',
		title: 'Schritt 5: Positionspapier',
		content: doc(paragraph('Das Positionspapier fasst die Haltung deines Landes zusammen.'), {
			type: 'button',
			attrs: { href: 'guide:seed-guide-why', label: 'Zurück zum Anfang' }
		})
	},
	{
		id: 'seed-guide-abc',
		title: 'UN-ABC',
		content: doc(
			heading('A'),
			{
				type: 'toggle',
				attrs: { summary: 'Abrüstung' },
				content: [paragraph('Die Verringerung von Waffen und Streitkräften.')]
			},
			heading('B'),
			{
				type: 'toggle',
				attrs: { summary: 'Blauhelme' },
				content: [paragraph('Die Friedenstruppen der Vereinten Nationen.')]
			}
		)
	},
	{
		id: 'seed-guide-nsa',
		title: 'Vorbereitung als NA-Vertreter*in',
		content: doc(paragraph('Als nichtstaatlicher Akteur vertrittst du eine Organisation.'))
	},
	{
		id: 'seed-guide-press',
		title: 'Vorbereitung als Journalist*in',
		content: doc(paragraph('Als Teil der Presse berichtest du über die Konferenz.'))
	},
	{
		id: 'seed-guide-supervisors',
		title: 'Hinweise für Betreuende',
		series: true,
		content: doc(paragraph('So begleitest du deine Schüler*innen durch die Vorbereitung.'))
	}
];

/** The series and the shared pages, once. */
export function addGuideBasics(batch: SeedBatch) {
	batch.conferenceSeries.push(
		{ id: SEED_SERIES.sh, name: 'MUN-SH', abbreviation: 'SH' },
		{ id: SEED_SERIES.bw, name: 'MUNBW', abbreviation: 'BW' }
	);
	for (const page of SHARED_PAGES) {
		const scope = page.series
			? { seriesId: SEED_SERIES.sh, year: null, conferenceId: null }
			: { seriesId: null, year: null, conferenceId: null };
		publish({ batch, page: { id: page.id, title: page.title, content: page.content, ...scope } });
	}
	// a page still in the works
	batch.guidePage.push({
		id: 'seed-guide-draft',
		title: 'Schritt 6: Arbeitspapier',
		content: doc(paragraph('Dieser Schritt wird gerade geschrieben.'))
	});
}

/** Adds the page with its first published version. */
function publish({ batch, page }: { batch: SeedBatch; page: Page & { id: string } }) {
	const versionId = `${page.id}-v1`;
	batch.guidePage.push({
		...page,
		publishedVersionId: versionId,
		publishedSeriesId: page.seriesId ?? null,
		publishedYear: page.year ?? null,
		publishedConferenceId: page.conferenceId ?? null
	});
	batch.guidePageVersion.push({
		id: versionId,
		pageId: page.id,
		number: 1,
		title: page.title,
		content: page.content,
		seriesId: page.seriesId ?? null,
		year: page.year ?? null,
		conferenceId: page.conferenceId ?? null,
		publishedById: 'dev-team-content-lead'
	});
}

/** The conference's own pages and its sidebar, for conferences with committees. */
export function addGuide(cs: ConferenceSeed) {
	if (cs.plan.key === 'elsewhere' || cs.committees.length === 0) return;
	const own = cs.rowId('guide-organisation');
	publish({
		batch: cs.batch,
		page: {
			id: own,
			title: 'Organisatorisches',
			conferenceId: cs.id,
			content: doc(
				heading('Ablauf & Locations'),
				paragraph(`Alles zum Ablauf von ${cs.conference.title}.`),
				{
					type: 'callout',
					attrs: { icon: 'map-pin', color: 'success' },
					content: [paragraph('Die Locations stehen im Kalender.')]
				}
			)
		}
	});
	for (const committee of cs.committees.slice(0, 3)) {
		publish({
			batch: cs.batch,
			page: {
				id: cs.rowId(`guide-committee-${committee.id}`),
				kind: 'COMMITTEE',
				committeeId: committee.id,
				conferenceId: cs.id,
				title: `Schritt 3: Auf mein Gremium vorbereiten – ${committee.abbreviation}`,
				content: doc(paragraph(`Der ${committee.name} und seine Arbeitsweise.`))
			}
		});
		for (const [index, agendaItemId] of committee.agendaItemIds.entries()) {
			const committeeIndex = cs.committees.indexOf(committee);
			publish({
				batch: cs.batch,
				page: {
					id: cs.rowId(`guide-agenda-${agendaItemId}`),
					kind: 'AGENDA_ITEM',
					agendaItemId,
					conferenceId: cs.id,
					title: `${committee.abbreviation} TOP ${index + 1}`,
					content: doc(...agendaItemPageContent({ index, committeeIndex }))
				}
			});
		}
	}
	const outline: Outline = {
		sections: [
			{
				id: 'start',
				title: 'Los geht es',
				audience: { type: 'everyone' },
				entries: [
					{ pageId: 'seed-guide-why' },
					{ pageId: 'seed-guide-supervisors', audience: { type: 'supervisors' } }
				]
			},
			{
				id: 'nsa',
				title: 'Vorbereitung als NA',
				audience: { type: 'nonStateActors' },
				entries: [{ pageId: 'seed-guide-nsa' }]
			},
			...(cs.customRoleIds[0]
				? [
						{
							id: 'press',
							title: 'Presse',
							audience: { type: 'customRoles' as const, roleIds: [cs.customRoleIds[0]] },
							entries: [{ pageId: 'seed-guide-press' }]
						}
					]
				: []),
			{
				id: 'organisation',
				title: 'Organisatorisches',
				audience: { type: 'everyone' },
				entries: [{ pageId: own, label: 'Ablauf & Locations' }]
			},
			{
				id: 'terms',
				title: 'Wichtige Begriffe',
				audience: { type: 'everyone' },
				entries: [{ pageId: 'seed-guide-abc' }]
			}
		],
		committeeTemplate: {
			position: 1,
			titleFormat: 'COMMITTEE_NAME',
			slots: [
				{ type: 'page', pageId: 'seed-guide-role' },
				{ type: 'committeePage', label: 'Schritt 3: Mein Gremium' },
				{ type: 'agendaItemPages' },
				{ type: 'page', pageId: 'seed-guide-paper' }
			]
		}
	};
	const outlineId = cs.rowId('guide-outline');
	cs.batch.guideOutline.push({
		id: outlineId,
		conferenceId: cs.id,
		draft: outline,
		published: outline,
		publishedAt: new Date(),
		publishedById: 'dev-team-content-lead'
	});
	cs.batch.guideOutlineVersion.push({
		id: `${outlineId}-v1`,
		outlineId,
		number: 1,
		outline,
		publishedById: 'dev-team-content-lead'
	});
}
