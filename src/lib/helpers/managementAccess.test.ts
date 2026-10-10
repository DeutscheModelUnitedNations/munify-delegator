import { describe, expect, test } from 'vitest';
import {
	canConfigureCommittees,
	canWriteAccessCards,
	canPlanSeats,
	isSeatPlanningOnly,
	managementNav,
	managementRedirect
} from './managementAccess';

describe('managementRedirect', () => {
	test('keeps content leads on the seat planning', () => {
		expect(managementRedirect('c1', '/dashboard/c1/management/stats', 'CONTENT_LEAD')).toBe(
			'/dashboard/c1/management/seat-planning'
		);
		expect(managementRedirect('c1', '/dashboard/c1/management', 'CONTENT_LEAD')).toBe(
			'/dashboard/c1/management/seat-planning'
		);
		expect(
			managementRedirect('c1', '/dashboard/c1/management/seat-planning', 'CONTENT_LEAD')
		).toBeUndefined();
	});

	test('does not mistake similarly named routes for the seat planning', () => {
		expect(
			managementRedirect('c1', '/dashboard/c1/management/seat-planning-x', 'CONTENT_LEAD')
		).toBe('/dashboard/c1/management/seat-planning');
	});

	test('sends participant care away from the seat planning', () => {
		expect(
			managementRedirect('c1', '/dashboard/c1/management/seat-planning', 'PARTICIPANT_CARE')
		).toBe('/dashboard/c1/management');
		expect(
			managementRedirect('c1', '/dashboard/c1/management/stats', 'PARTICIPANT_CARE')
		).toBeUndefined();
	});

	test('lets admins and the project management everywhere', () => {
		for (const membership of ['SYSTEM_ADMIN', 'PROJECT_MANAGEMENT']) {
			expect(
				managementRedirect('c1', '/dashboard/c1/management/seat-planning', membership)
			).toBeUndefined();
			expect(
				managementRedirect('c1', '/dashboard/c1/management/payments', membership)
			).toBeUndefined();
		}
	});
});

describe('role checks', () => {
	test('only content leads are restricted to the seat planning', () => {
		expect(isSeatPlanningOnly('CONTENT_LEAD')).toBe(true);
		expect(isSeatPlanningOnly('PROJECT_MANAGEMENT')).toBe(false);
		expect(isSeatPlanningOnly(undefined)).toBe(false);
	});

	test('admins, project management and content leads plan seats', () => {
		expect(canPlanSeats('SYSTEM_ADMIN')).toBe(true);
		expect(canPlanSeats('PROJECT_MANAGEMENT')).toBe(true);
		expect(canPlanSeats('CONTENT_LEAD')).toBe(true);
		expect(canPlanSeats('PARTICIPANT_CARE')).toBe(false);
		expect(canPlanSeats(undefined)).toBe(false);
	});

	test('only admins and the project management configure committees', () => {
		expect(canConfigureCommittees('SYSTEM_ADMIN')).toBe(true);
		expect(canConfigureCommittees('PROJECT_MANAGEMENT')).toBe(true);
		expect(canConfigureCommittees('CONTENT_LEAD')).toBe(false);
		expect(canConfigureCommittees('PARTICIPANT_CARE')).toBe(false);
	});

	test('only admins, project management and participant care store access cards', () => {
		expect(canWriteAccessCards('SYSTEM_ADMIN')).toBe(true);
		expect(canWriteAccessCards('PROJECT_MANAGEMENT')).toBe(true);
		expect(canWriteAccessCards('PARTICIPANT_CARE')).toBe(true);
		expect(canWriteAccessCards('CONTENT_LEAD')).toBe(false);
		expect(canWriteAccessCards(undefined)).toBe(false);
	});
});

describe('managementNav', () => {
	test('a participant only gets the paper hub', () => {
		expect(managementNav(undefined, [], true)).toEqual({
			management: false,
			seatPlanning: false,
			teamManagement: false,
			scanner: false,
			paperHub: true
		});
	});

	test('a reviewer gets the scanner and the paper hub, but no management', () => {
		const nav = managementNav(undefined, ['REVIEWER'], true);
		expect(nav).toMatchObject({ management: false, scanner: true, paperHub: true });
	});

	test('a team coordinator manages the team and nothing else', () => {
		expect(managementNav(undefined, ['TEAM_COORDINATOR'], false)).toMatchObject({
			management: false,
			teamManagement: true,
			scanner: true,
			paperHub: false
		});
	});

	test('a content lead gets the seat planning on its own', () => {
		expect(managementNav('CONTENT_LEAD', ['CONTENT_LEAD'], false)).toMatchObject({
			management: false,
			seatPlanning: true,
			teamManagement: false
		});
	});

	test('participant care has management but not the team pages', () => {
		expect(managementNav('PARTICIPANT_CARE', ['PARTICIPANT_CARE'], true)).toMatchObject({
			management: true,
			teamManagement: false,
			paperHub: true
		});
	});

	test('system admins see everything', () => {
		expect(managementNav('SYSTEM_ADMIN', [], false)).toMatchObject({
			management: true,
			teamManagement: true,
			scanner: true,
			paperHub: true
		});
	});
});
