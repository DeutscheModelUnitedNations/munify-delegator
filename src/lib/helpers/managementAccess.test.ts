import { describe, expect, test } from 'vitest';
import {
	canConfigureCommittees,
	canPlanSeats,
	isSeatPlanningOnly,
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
});
