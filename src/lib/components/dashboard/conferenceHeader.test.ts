import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/paraglide/runtime.js', () => ({ getLocale: () => 'en' }));
vi.mock('#lib/paraglide/messages.js', () => ({
	m: {
		conferenceStatusPre: () => 'pre',
		conferenceStatusParticipantRegistration: () => 'registration',
		conferenceStatusPreparation: () => 'preparation',
		conferenceStatusActive: () => 'active',
		conferenceStatusPost: () => 'post'
	}
}));

const { formatDateRange, getStateColor, translateState } = await import('./conferenceHeader');

describe('formatDateRange', () => {
	test('names the month once when both dates are in it', () => {
		expect(formatDateRange(new Date(2026, 4, 3), new Date(2026, 4, 5))).toBe('3. – May 5, 2026');
	});

	test('writes both dates out across months and years', () => {
		expect(formatDateRange(new Date(2026, 4, 30), new Date(2026, 5, 2))).toBe(
			'May 30, 2026 – June 2, 2026'
		);
		expect(formatDateRange(new Date(2025, 4, 3), new Date(2026, 4, 5))).toBe(
			'May 3, 2025 – May 5, 2026'
		);
	});

	test('is empty while a date is missing', () => {
		expect(formatDateRange(null, new Date(2026, 4, 5))).toBe('');
		expect(formatDateRange(new Date(2026, 4, 5), undefined)).toBe('');
	});
});

describe('conference state', () => {
	test('has a label and a badge color for every state', () => {
		expect(translateState('PRE')).toBe('pre');
		expect(translateState('PARTICIPANT_REGISTRATION')).toBe('registration');
		expect(translateState('PREPARATION')).toBe('preparation');
		expect(translateState('ACTIVE')).toBe('active');
		expect(translateState('POST')).toBe('post');
		expect(getStateColor('PARTICIPANT_REGISTRATION')).toBe('badge-info');
		expect(getStateColor('ACTIVE')).toBe('badge-success');
	});
});
