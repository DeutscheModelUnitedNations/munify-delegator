import { describe, expect, it } from 'vitest';
import { helpForRoute } from './help';
import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { teamRoutes } from '#lib/data/teamRoutes';
import { DEFAULT_HELP_DOCS, routeHelp } from './routeHelp';

/** Team pages without a tour of their own: the helper is two buttons */
const TEAM_PAGES_WITHOUT_TOUR = new Set(['helper']);

/** Every tour, including those a route picks by what is on screen (the paper hub's views) */
const tourModules = import.meta.glob<Record<string, unknown>>('./tours/**/*.tour.ts', {
	eager: true
});

function isTour(value: unknown): value is Tour {
	return typeof value === 'object' && value !== null && 'id' in value && 'steps' in value;
}

describe('helpForRoute', () => {
	it('links a route to its manual section', () => {
		const help = helpForRoute('/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting');
		expect(help.manualHref).toBe('/docs/user-manual/team/assignment#sighting');
		expect(help.specific).toBe(true);
	});

	it('offers the tour of a route that has one', () => {
		expect(helpForRoute('/(authenticated)/dashboard/[conferenceId]').tour).toBeTypeOf('function');
	});

	it('offers a tour on every team page in the navigation', () => {
		const withTour = new Set(
			Object.entries(routeHelp)
				.filter(([, help]) => help?.tour)
				.map(([routeId]) => routeId)
		);
		// The registry's paths are relative to the conference's dashboard
		const missing = teamRoutes
			.filter((route) => !TEAM_PAGES_WITHOUT_TOUR.has(route.id))
			.filter((route) => !withTour.has(`/(authenticated)/dashboard/[conferenceId]/${route.path}`))
			.map((route) => route.id);
		expect(missing).toEqual([]);
	});

	it('loads every tour, each with its words in place', () => {
		for (const [file, module] of Object.entries(tourModules)) {
			expect(Object.values(module).some(isTour), file).toBe(true);
		}
		const tours = Object.values(tourModules).flatMap((module) =>
			Object.values(module).filter(isTour)
		);
		expect(new Set(tours.map((tour) => tour.id)).size).toBe(tours.length);
		for (const tour of tours) {
			expect(tour.steps.length, tour.id).toBeGreaterThan(0);
			for (const step of tour.steps) {
				expect(step.title(), `${tour.id}: ${step.anchor}`).not.toBe('');
				expect(step.body(), `${tour.id}: ${step.anchor}`).not.toBe('');
			}
		}
	});

	it('offers a tour on every route a tour is wired to', async () => {
		for (const [routeId, help] of Object.entries(routeHelp)) {
			if (help?.tour) expect((await help.tour()).steps.length, routeId).toBeGreaterThan(0);
		}
	});

	it('falls back to the start page for routes without help, and for no route', () => {
		for (const routeId of ['/(authenticated)/team-tender', null] as const) {
			const help = helpForRoute(routeId);
			expect(help.manualHref).toBe(`/docs/${DEFAULT_HELP_DOCS}`);
			expect(help.specific).toBe(false);
			expect(help.tour).toBeUndefined();
		}
	});

	it('only names manual pages, never a full URL', () => {
		for (const help of Object.values(routeHelp)) expect(help?.docs).toMatch(/^[\w/-]+(#[\w-]+)?$/);
	});
});
