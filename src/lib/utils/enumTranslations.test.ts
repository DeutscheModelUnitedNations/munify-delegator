import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import {
	translateAdministrativeStatus,
	translateCalendarEntryColor,
	translateFoodPreference,
	translateGender,
	translateParticipationRole,
	translatePaperStatus,
	translatePaperType,
	translateTeamRole
} from './enumTranslations';

describe('translateParticipationRole', () => {
	test.each([
		['DELEGATION_MEMBER', m.delegationMember()],
		['SINGLE_PARTICIPANT', m.singleParticipant()],
		['SUPERVISOR', m.supervisor()],
		['TEAM_MEMBER', m.teamMember()]
	])('translates %s', (role, translated) => {
		expect(translateParticipationRole(role)).toBe(translated);
		expect(translated).not.toBe(role);
	});

	test('passes an unknown role through', () => {
		expect(translateParticipationRole('OBSERVER')).toBe('OBSERVER');
	});
});

describe('the other enum translations', () => {
	test('translate paper statuses and types', () => {
		expect(translatePaperStatus('DRAFT')).toBe(m.paperStatusDraft());
		expect(translatePaperStatus('SUBMITTED')).toBe(m.paperStatusSubmitted());
		expect(translatePaperStatus('REVISED')).toBe(m.paperStatusRevised());
		expect(translatePaperStatus('CHANGES_REQUESTED')).toBe(m.paperStatusChangesRequested());
		expect(translatePaperStatus('ACCEPTED')).toBe(m.paperStatusAccepted());
		expect(translatePaperType('POSITION_PAPER')).toBe(m.paperTypePositionPaper());
		expect(translatePaperType('INTRODUCTION_PAPER')).toBe(m.paperTypeIntroductionPaper());
		expect(translatePaperType('WORKING_PAPER')).toBe(m.paperTypeWorkingPaper());
	});

	test('translate calendar entry colors', () => {
		expect([
			translateCalendarEntryColor('SESSION'),
			translateCalendarEntryColor('WORKSHOP'),
			translateCalendarEntryColor('LOGISTICS'),
			translateCalendarEntryColor('SOCIAL'),
			translateCalendarEntryColor('CEREMONY'),
			translateCalendarEntryColor('BREAK'),
			translateCalendarEntryColor('HIGHLIGHT'),
			translateCalendarEntryColor('INFO')
		]).toEqual([
			m.calendarSession(),
			m.calendarWorkshop(),
			m.calendarLogistics(),
			m.calendarSocial(),
			m.calendarCeremony(),
			m.calendarBreak(),
			m.calendarHighlight(),
			m.calendarInfo()
		]);
	});

	test('translate genders, statuses, food preferences and team roles, passing unknowns through', () => {
		expect(['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT', 'X'].map(translateGender)).toEqual([
			m.male(),
			m.female(),
			m.diverse(),
			m.noStatement(),
			'X'
		]);
		expect(['DONE', 'PENDING', 'PROBLEM', 'X'].map(translateAdministrativeStatus)).toEqual([
			m.statusDone(),
			m.statusPending(),
			m.statusProblem(),
			'X'
		]);
		expect(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'X'].map(translateFoodPreference)).toEqual([
			m.omnivore(),
			m.vegetarian(),
			m.vegan(),
			'X'
		]);
		expect(
			[
				'PROJECT_MANAGEMENT',
				'PARTICIPANT_CARE',
				'REVIEWER',
				'MEMBER',
				'TEAM_COORDINATOR',
				'CONTENT_LEAD',
				'SYSTEM_ADMIN',
				'X'
			].map(translateTeamRole)
		).toEqual([
			m.teamRoleProjectManagement(),
			m.teamRoleParticipantCare(),
			m.teamRoleReviewer(),
			m.teamRoleMember(),
			m.teamRoleTeamCoordinator(),
			m.teamRoleContentLead(),
			m.administrator(),
			'X'
		]);
	});
});
