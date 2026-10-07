import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';
import { m } from '$lib/paraglide/messages';

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

export function getAllPages(conferenceId: string): PageEntry[] {
	return [
		{
			id: 'stats',
			title: () => m.adminStats(),
			icon: 'fa-chart-pie',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/stats', { conferenceId }),
			category: 'management',
			keywords: ['statistik', 'statistics', 'übersicht', 'overview', 'zahlen', 'numbers']
		},
		{
			id: 'configuration',
			title: () => m.settings(),
			icon: 'fa-gears',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/configuration', {
				conferenceId
			}),
			category: 'management',
			keywords: [
				'einstellungen',
				'settings',
				'konfiguration',
				'configuration',
				'konferenz',
				'conference'
			]
		},
		{
			id: 'seats',
			title: () => m.seats(),
			icon: 'fa-chair-office',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/seats', { conferenceId }),
			category: 'management',
			keywords: ['plätze', 'seats', 'gremien', 'committees', 'nationen', 'nations']
		},
		{
			id: 'seatPlanning',
			title: () => m.seatPlanning(),
			icon: 'fa-table-cells',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/seat-planning', {
				conferenceId
			}),
			category: 'management',
			keywords: ['sitzplanung', 'seat planning', 'sitzverteilung', 'matrix', 'gremien', 'staaten']
		},
		{
			id: 'participants',
			title: () => m.adminUsers(),
			icon: 'fa-users',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/participants', {
				conferenceId
			}),
			category: 'tables',
			keywords: ['teilnehmende', 'participants', 'nutzer', 'users', 'personen']
		},
		{
			id: 'delegations',
			title: () => m.adminDelegations(),
			icon: 'fa-users-viewfinder',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/delegations', {
				conferenceId
			}),
			category: 'tables',
			keywords: ['delegationen', 'delegations', 'schulen', 'schools', 'gruppen', 'groups']
		},
		{
			id: 'individuals',
			title: () => m.adminSingleParticipants(),
			icon: 'fa-user',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/individuals', {
				conferenceId
			}),
			category: 'tables',
			keywords: ['einzelteilnehmende', 'individual', 'einzelpersonen', 'single', 'rollen', 'roles']
		},
		{
			id: 'supervisors',
			title: () => m.adminSupervisors(),
			icon: 'fa-chalkboard-user',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/supervisors', {
				conferenceId
			}),
			category: 'tables',
			keywords: ['betreuer', 'supervisors', 'betreuende', 'aufsicht']
		},
		{
			id: 'waitingList',
			title: () => m.waitingList(),
			icon: 'fa-user-clock',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/waitingList', {
				conferenceId
			}),
			category: 'tables',
			keywords: ['warteliste', 'waiting list', 'nachrücker', 'wartend']
		},
		{
			id: 'assignment',
			title: () => m.adminAssignment(),
			icon: 'fa-shuffle',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/assignment', {
				conferenceId
			}),
			category: 'workflows',
			keywords: ['zuweisung', 'assignment', 'zuteilen', 'verteilen', 'assign']
		},
		{
			id: 'postalRegistration',
			title: () => m.postalRegistration(),
			icon: 'fa-envelope',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/postalRegistration', {
				conferenceId
			}),
			category: 'workflows',
			keywords: ['postalische anmeldung', 'postal registration', 'brief', 'post', 'dokumente']
		},
		{
			id: 'payments',
			title: () => m.payment(),
			icon: 'fa-money-bill-transfer',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/payments', {
				conferenceId
			}),
			category: 'workflows',
			keywords: ['zahlung', 'payment', 'geld', 'money', 'überweisung', 'transfer', 'bezahlung']
		},
		{
			id: 'accessFlow',
			title: () => m.accessFlow(),
			icon: 'fa-id-card-clip',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/accessFlow', {
				conferenceId
			}),
			category: 'workflows',
			keywords: ['zugang', 'access', 'einlass', 'check-in', 'registrierung', 'badge']
		},
		{
			id: 'announcement',
			title: () => m.announcementSectionTitle(),
			icon: 'fa-bullhorn',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/announcement', {
				conferenceId
			}),
			category: 'communication',
			keywords: ['ankündigungen', 'announcements', 'nachrichten', 'messages', 'mitteilungen']
		},
		{
			id: 'calendar',
			title: () => m.calendar(),
			icon: 'fa-calendar-days',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/calendar', {
				conferenceId
			}),
			category: 'communication',
			keywords: ['kalender', 'calendar', 'zeitplan', 'schedule', 'termine', 'events']
		},
		{
			id: 'survey',
			title: () => m.survey(),
			icon: 'fa-chart-pie',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/survey', {
				conferenceId
			}),
			category: 'communication',
			keywords: ['umfrage', 'survey', 'abstimmung', 'poll', 'fragebogen']
		},
		{
			id: 'plausibility',
			title: () => m.adminPlausibility(),
			icon: 'fa-shield-check',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/plausibility', {
				conferenceId
			}),
			category: 'maintenance',
			keywords: ['plausibilität', 'plausibility', 'prüfung', 'check', 'validierung']
		},
		{
			id: 'cleanup',
			title: () => m.cleanup(),
			icon: 'fa-broom',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/cleanup', {
				conferenceId
			}),
			category: 'maintenance',
			keywords: ['aufräumen', 'cleanup', 'bereinigen', 'clean']
		},
		{
			id: 'helper',
			title: () => m.helper(),
			icon: 'fa-gear-code',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/helper', {
				conferenceId
			}),
			category: 'maintenance',
			keywords: ['helfer', 'helper', 'werkzeuge', 'tools', 'hilfsmittel']
		},
		{
			id: 'import',
			title: () => m.import(),
			icon: 'fa-file-import',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/import', {
				conferenceId
			}),
			category: 'maintenance',
			keywords: ['import', 'importieren', 'daten', 'data', 'hochladen', 'upload']
		},
		{
			id: 'downloads',
			title: () => m.downloads(),
			icon: 'fa-download',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/management/downloads', {
				conferenceId
			}),
			category: 'maintenance',
			keywords: ['downloads', 'herunterladen', 'export', 'exportieren']
		},
		{
			id: 'team-management',
			title: () => m.teamManagement(),
			icon: 'fa-user-group',
			href: resolve('/(authenticated)/dashboard/[conferenceId]/team-management', { conferenceId }),
			category: 'management',
			keywords: ['team', 'verwaltung', 'management', 'mitglieder', 'members']
		}
	];
}

export function getConfigEntries(): ConfigEntry[] {
	return [
		// General tab
		{
			id: 'config-general-title',
			title: () => m.conferenceTitle(),
			section: () => m.general(),
			icon: 'fa-gear',
			tab: 'general',
			keywords: ['titel', 'title', 'name', 'konferenz', 'conference']
		},
		{
			id: 'config-general-location',
			title: () => m.conferenceLocation(),
			section: () => m.general(),
			icon: 'fa-gear',
			tab: 'general',
			keywords: ['ort', 'location', 'stadt', 'city']
		},
		{
			id: 'config-general-dates',
			title: () => m.conferenceStart(),
			section: () => m.general(),
			icon: 'fa-gear',
			tab: 'general',
			keywords: ['datum', 'date', 'start', 'ende', 'end', 'zeitraum']
		},
		{
			id: 'config-general-image',
			title: () => m.conferenceImage(),
			section: () => m.general(),
			icon: 'fa-gear',
			tab: 'general',
			keywords: ['bild', 'image', 'foto', 'photo', 'logo', 'emblem']
		},
		// Committees tab
		{
			id: 'config-committees',
			title: () => m.committeesAndAgendaItems(),
			section: () => m.settings(),
			icon: 'fa-podium',
			tab: 'committees',
			keywords: ['gremien', 'committees', 'themen', 'agenda', 'items']
		},
		// Status tab
		{
			id: 'config-status-features',
			title: () => m.statusAndFeatures(),
			section: () => m.settings(),
			icon: 'fa-toggle-on',
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
			icon: 'fa-toggle-on',
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
			icon: 'fa-link',
			tab: 'links',
			keywords: ['links', 'wiki', 'services', 'dienste', 'preparation', 'vorbereitung']
		},
		// Payments tab
		{
			id: 'config-payments',
			title: () => m.bankingInformation(),
			section: () => m.settings(),
			icon: 'fa-credit-card',
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
			icon: 'fa-file-pdf',
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
