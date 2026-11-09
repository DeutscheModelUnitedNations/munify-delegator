import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';
import { m } from '#lib/paraglide/messages';
import { teamRoutesFor } from '#lib/data/teamRoutes';
import type { TeamAccess } from '#lib/helpers/teamAccess';
import type { RouteId } from '$app/types';
import { helpForRoute } from '#lib/docs/help';
import type { ManualEntry } from './commandPaletteItems';

export interface PageEntry {
	id: string;
	title: () => string;
	icon: string;
	href: ResolvedPathname;
	category: string;
	keywords: string[];
}

export interface ConfigEntry {
	id: string;
	title: () => string;
	section: () => string;
	icon: string;
	tab: string;
	keywords: string[];
}

/**
 * The team pages the caller may open, as command palette entries. Read from the route registry,
 * so the palette offers exactly what the side navigation and the route guard allow.
 */
export function getAllPages({
	conferenceId,
	access
}: {
	conferenceId: string;
	access: TeamAccess & { canSeePaperHub?: boolean };
}): PageEntry[] {
	return teamRoutesFor(access).map((route) => ({
		id: route.id,
		title: route.title,
		icon: route.icon,
		href: resolve(`dashboard/${conferenceId}/${route.path}`),
		category: route.category,
		keywords: [...route.keywords]
	}));
}

/** The palette's way into the manual: the page about the route on screen, or the manual's start. */
export function manualPaletteEntry(routeId: RouteId | null): ManualEntry {
	const help = helpForRoute(routeId);
	return {
		id: 'manual',
		title: help.specific ? m.helpManualForPage : m.helpManual,
		href: help.manualHref
	};
}

const MANUAL_WORDS = ['hilfe', 'help', 'handbuch', 'manual', 'anleitung', 'doku', 'docs', 'tour'];

/**
 * Whether the search asks for the manual: an empty search, a word for help, or the start of one
 * (three letters at least, so a name starting with "h" does not bring up the manual).
 */
export function matchesManual(search: string) {
	const term = search.trim().toLowerCase();
	if (term === '') return true;
	return MANUAL_WORDS.some(
		(word) => term.includes(word) || (term.length >= 3 && word.startsWith(term))
	);
}

export function getConfigEntries(): ConfigEntry[] {
	return [
		// General tab
		{
			id: 'config-general-title',
			title: () => m.conferenceTitle(),
			section: () => m.general(),
			icon: 'ph-gear',
			tab: 'general',
			keywords: ['titel', 'title', 'name', 'konferenz', 'conference']
		},
		{
			id: 'config-general-location',
			title: () => m.conferenceLocation(),
			section: () => m.general(),
			icon: 'ph-gear',
			tab: 'general',
			keywords: ['ort', 'location', 'stadt', 'city']
		},
		{
			id: 'config-general-dates',
			title: () => m.conferenceStart(),
			section: () => m.general(),
			icon: 'ph-gear',
			tab: 'general',
			keywords: ['datum', 'date', 'start', 'ende', 'end', 'zeitraum']
		},
		{
			id: 'config-general-image',
			title: () => m.conferenceImage(),
			section: () => m.general(),
			icon: 'ph-gear',
			tab: 'general',
			keywords: ['bild', 'image', 'foto', 'photo', 'logo', 'emblem']
		},
		// Committees tab
		{
			id: 'config-committees',
			title: () => m.committeesAndAgendaItems(),
			section: () => m.settings(),
			icon: 'ph-lectern',
			tab: 'committees',
			keywords: ['gremien', 'committees', 'themen', 'agenda', 'items']
		},
		// Status tab
		{
			id: 'config-status-features',
			title: () => m.statusAndFeatures(),
			section: () => m.settings(),
			icon: 'ph-toggle-right',
			tab: 'status',
			keywords: [
				'status',
				'features',
				'funktionen',
				'zahlung',
				'payment',
				'postal',
				'paper',
				'kalender',
				'calendar'
			]
		},
		{
			id: 'config-status-state',
			title: () => m.conferenceStatus(),
			section: () => m.statusAndFeatures(),
			icon: 'ph-toggle-right',
			tab: 'status',
			keywords: [
				'konferenzstatus',
				'conference status',
				'phase',
				'registration',
				'anmeldung',
				'preparation',
				'vorbereitung',
				'active',
				'aktiv'
			]
		},
		// Links tab
		{
			id: 'config-links',
			title: () => m.linksAndContent(),
			section: () => m.settings(),
			icon: 'ph-link',
			tab: 'links',
			keywords: ['links', 'wiki', 'services', 'dienste', 'preparation', 'vorbereitung']
		},
		// Payments tab
		{
			id: 'config-payments',
			title: () => m.bankingInformation(),
			section: () => m.settings(),
			icon: 'ph-credit-card',
			tab: 'payments',
			keywords: [
				'bank',
				'banking',
				'iban',
				'bic',
				'konto',
				'account',
				'gebühr',
				'fee',
				'währung',
				'currency'
			]
		},
		// Documents tab
		{
			id: 'config-documents',
			title: () => m.documentsAndTemplates(),
			section: () => m.settings(),
			icon: 'ph-file-pdf',
			tab: 'documents',
			keywords: [
				'dokumente',
				'documents',
				'vorlagen',
				'templates',
				'pdf',
				'vertrag',
				'contract',
				'zertifikat',
				'certificate',
				'medienfreigabe',
				'media consent'
			]
		}
	];
}
