import { describe, expect, test } from 'vitest';
import { boundaryKey } from './boundaryKey';

describe('boundaryKey', () => {
	test('is the pathname when no frame is on it', () => {
		expect(boundaryKey({ pathname: '/dashboard/c1/team/stats', frames: ['team/assignment'] })).toBe(
			'/dashboard/c1/team/stats'
		);
		expect(boundaryKey({ pathname: '/dashboard/c1', frames: ['paperhub'] })).toBe('/dashboard/c1');
	});

	test('stops at a frame, so the pages inside it share one key', () => {
		const frames = ['team/assignment'];
		expect(boundaryKey({ pathname: '/dashboard/c1/team/assignment/sighting', frames })).toBe(
			'/dashboard/c1/team/assignment'
		);
		expect(boundaryKey({ pathname: '/dashboard/c1/team/assignment/finish', frames })).toBe(
			'/dashboard/c1/team/assignment'
		);
		expect(boundaryKey({ pathname: '/dashboard/c1/team/assignment', frames })).toBe(
			'/dashboard/c1/team/assignment'
		);
	});

	test('keeps a locale prefix', () => {
		expect(boundaryKey({ pathname: '/en/dashboard/c1/paperhub/p1', frames: ['paperhub'] })).toBe(
			'/en/dashboard/c1/paperhub'
		);
	});

	test('matches whole segments only', () => {
		expect(
			boundaryKey({ pathname: '/dashboard/c1/team/assignments/x', frames: ['team/assignment'] })
		).toBe('/dashboard/c1/team/assignments/x');
	});
});
