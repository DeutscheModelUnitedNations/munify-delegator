import { describe, expect, test } from 'vitest';
import { audienceArgSchema, slotsArgSchema, titleArgSchema } from './outlineArgs';

describe('audienceArgSchema', () => {
	test('plain audiences drop role ids', () => {
		expect(audienceArgSchema.parse({ type: 'delegates', roleIds: ['r1'] })).toEqual({
			type: 'delegates'
		});
	});

	test('custom roles need at least one role, listed once', () => {
		expect(audienceArgSchema.parse({ type: 'customRoles', roleIds: ['r1', 'r1', 'r2'] })).toEqual({
			type: 'customRoles',
			roleIds: ['r1', 'r2']
		});
		expect(audienceArgSchema.safeParse({ type: 'customRoles', roleIds: [] }).success).toBe(false);
		expect(audienceArgSchema.safeParse({ type: 'customRoles' }).success).toBe(false);
		expect(audienceArgSchema.safeParse({ type: 'press' }).success).toBe(false);
	});
});

describe('slotsArgSchema', () => {
	test('turns the input into template slots', () => {
		expect(
			slotsArgSchema.parse([
				{ type: 'page', pageId: 'p1', label: ' Rolle ' },
				{ type: 'committeePage', pageId: 'ignored', label: null },
				{ type: 'agendaItemPages', label: 'dropped' }
			])
		).toEqual([
			{ type: 'page', pageId: 'p1', label: 'Rolle' },
			{ type: 'committeePage' },
			{ type: 'agendaItemPages' }
		]);
	});

	test('a page slot needs its page', () => {
		expect(slotsArgSchema.safeParse([{ type: 'page' }]).success).toBe(false);
	});
});

test('titles are trimmed and not empty', () => {
	expect(titleArgSchema.parse('  Start ')).toBe('Start');
	expect(titleArgSchema.safeParse('   ').success).toBe(false);
	expect(titleArgSchema.safeParse('x'.repeat(201)).success).toBe(false);
});
