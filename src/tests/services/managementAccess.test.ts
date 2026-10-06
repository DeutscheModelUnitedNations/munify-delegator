import { describe, expect, test } from 'vitest';
import {
	canConfigureCommittees,
	canPlanSeats,
	isSeatPlanningOnly,
	managementRedirect
} from '$lib/services/managementAccess';

describe('managementRedirect', () => {
	test('keeps content leads on the seat planning', () => {
		expect(managementRedirect('c1', '/management/c1/stats', 'CONTENT_LEAD')).toBe(
			'/management/c1/seat-planning'
		);
		expect(managementRedirect('c1', '/management/c1', 'CONTENT_LEAD')).toBe(
			'/management/c1/seat-planning'
		);
		expect(
			managementRedirect('c1', '/management/c1/seat-planning', 'CONTENT_LEAD')
		).toBeUndefined();
	});

	test('does not mistake similarly named routes for the seat planning', () => {
		expect(managementRedirect('c1', '/management/c1/seat-planning-x', 'CONTENT_LEAD')).toBe(
			'/management/c1/seat-planning'
		);
	});

	test('sends participant care away from the seat planning', () => {
		expect(managementRedirect('c1', '/management/c1/seat-planning', 'PARTICIPANT_CARE')).toBe(
			'/management/c1'
		);
		expect(managementRedirect('c1', '/management/c1/stats', 'PARTICIPANT_CARE')).toBeUndefined();
	});

	test('lets admins and the project management everywhere', () => {
		for (const membership of ['SYSTEM_ADMIN', 'PROJECT_MANAGEMENT']) {
			expect(managementRedirect('c1', '/management/c1/seat-planning', membership)).toBeUndefined();
			expect(managementRedirect('c1', '/management/c1/payments', membership)).toBeUndefined();
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
