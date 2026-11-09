import { describe, expect, test } from 'vitest';
import { PAGE_SKELETON, type SkeletonNode } from '#lib/components/navigation/skeletonShapes';
import { teamRoutes, teamSkeletonForPath } from './teamRoutes';
import { ASSIGNMENT_TAB_SKELETONS, TEAM_SKELETONS } from './teamSkeletons';

const blockCount = (nodes: readonly SkeletonNode[]): number =>
	nodes.reduce((count, node) => count + (node.children ? blockCount(node.children) : 1), 0);

describe('teamSkeletonForPath', () => {
	test("gives every entry's page its entry's skeleton", () => {
		for (const route of teamRoutes) {
			if (route.id === 'assignment') continue;
			expect(teamSkeletonForPath(route.path).name, route.id).toBe(route.skeleton.name);
		}
	});

	test('gives pages below an entry their own skeleton', () => {
		expect(teamSkeletonForPath('team/schools').name).toBe('schools');
		expect(teamSkeletonForPath('team/schools/abc').name).toBe('school');
		expect(teamSkeletonForPath('team/survey/abc').name).toBe('surveyDetail');
		expect(teamSkeletonForPath('team/user/abc').name).toBe('user');
		expect(teamSkeletonForPath('team/invitations').name).toBe('invitations');
		expect(teamSkeletonForPath('/team/members/').name).toBe('members');
	});

	test('gives each assignment tab its own body', () => {
		expect(teamSkeletonForPath('team/assignment').name).toBe('assignmentSighting');
		expect(teamSkeletonForPath('team/assignment/finish').name).toBe('assignmentFinish');
		expect(teamSkeletonForPath('team/assignment/delegations').name).toBe('assignmentDelegations');
		expect(teamSkeletonForPath('team/assignment/unknown').name).toBe('assignmentSighting');
	});

	test('falls back to the generic skeleton for a path no entry owns', () => {
		expect(teamSkeletonForPath('team/nothing-here')).toBe(PAGE_SKELETON);
	});
});

test('every skeleton draws something', () => {
	for (const skeleton of [
		...Object.values(TEAM_SKELETONS),
		...Object.values(ASSIGNMENT_TAB_SKELETONS)
	]) {
		expect(blockCount(skeleton.nodes), skeleton.name).toBeGreaterThan(3);
	}
});
