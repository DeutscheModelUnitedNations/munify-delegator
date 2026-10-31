import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import {
	agendaItemOptions,
	newPaperAgendaItemId,
	newPaperSaveError,
	paperTypeOptions
} from './newPaperOptions';

describe('paperTypeOptions', () => {
	test('offers non-state actors introduction and position papers', () => {
		expect(paperTypeOptions(true).map((o) => o.value)).toEqual([
			'INTRODUCTION_PAPER',
			'POSITION_PAPER'
		]);
	});

	test('offers nations position papers only', () => {
		expect(paperTypeOptions(false)).toEqual([
			{ value: 'POSITION_PAPER', label: m.paperTypePositionPaper() }
		]);
	});
});

describe('agendaItemOptions', () => {
	const conferenceAgendaItems = [
		{ id: 'b', title: 'Water', committee: { abbreviation: 'SC' } },
		{ id: 'a', title: 'Climate', committee: { abbreviation: 'GA' } }
	];
	const committeeAgendaItems = [{ id: 'c', title: 'Health' }];

	test('non-state actors pick from the whole conference, sorted by label', () => {
		expect(
			agendaItemOptions({
				isNSA: true,
				type: 'INTRODUCTION_PAPER',
				conferenceAgendaItems,
				committeeAgendaItems
			})
		).toEqual([
			{ value: 'a', label: 'GA: Climate' },
			{ value: 'b', label: 'SC: Water' }
		]);
	});

	test('an introduction paper spans committees', () => {
		expect(
			agendaItemOptions({
				isNSA: false,
				type: 'INTRODUCTION_PAPER',
				conferenceAgendaItems,
				committeeAgendaItems
			})
		).toEqual([{ value: 'INTRODUCTION_PAPER', label: m.paperAcrossCommittees() }]);
	});

	test('nations pick from their own committee', () => {
		const options = (items: { id: string; title: string }[] | undefined) =>
			agendaItemOptions({
				isNSA: false,
				type: 'POSITION_PAPER',
				conferenceAgendaItems,
				committeeAgendaItems: items
			});
		expect(options(committeeAgendaItems)).toEqual([{ value: 'c', label: 'Health' }]);
		expect(options(undefined)).toEqual([]);
	});
});

describe('newPaperAgendaItemId', () => {
	test('drops the agenda item of introduction papers', () => {
		expect(
			newPaperAgendaItemId({ type: 'INTRODUCTION_PAPER', agendaItemId: 'INTRODUCTION_PAPER' })
		).toBeUndefined();
		expect(newPaperAgendaItemId({ type: 'POSITION_PAPER', agendaItemId: 'a' })).toBe('a');
	});
});

describe('newPaperSaveError', () => {
	test('requires an agenda item except for introduction papers', () => {
		expect(newPaperSaveError({ type: 'POSITION_PAPER', agendaItemId: '', content: {} })).toBe(
			m.paperAgendaItemRequired()
		);
		expect(
			newPaperSaveError({ type: 'INTRODUCTION_PAPER', agendaItemId: '', content: {} })
		).toBeNull();
	});

	test('requires content', () => {
		expect(
			newPaperSaveError({ type: 'POSITION_PAPER', agendaItemId: 'a', content: undefined })
		).toBe(m.paperContentRequired());
	});

	test('accepts a complete paper', () => {
		expect(
			newPaperSaveError({ type: 'POSITION_PAPER', agendaItemId: 'a', content: { type: 'doc' } })
		).toBeNull();
	});
});
