import { describe, expect, it } from 'vitest';
import { helpForRoute } from './help';
import { DEFAULT_HELP_DOCS, routeHelp } from './routeHelp';

describe('helpForRoute', () => {
	it('links a route to its manual section', () => {
		const help = helpForRoute('/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting');
		expect(help.manualHref).toBe('/docs/user-manual/team/assignment#sighting');
		expect(help.specific).toBe(true);
		expect(help.tour).toBeUndefined();
	});

	it('offers the tour of a route that has one', () => {
		expect(helpForRoute('/(authenticated)/dashboard/[conferenceId]').tour).toBeTypeOf('function');
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
