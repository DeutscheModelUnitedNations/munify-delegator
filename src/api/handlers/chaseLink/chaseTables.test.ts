import { describe, expect, it } from 'vitest';
import { papersToAskFor } from './chaseTables';

describe('papersToAskFor', () => {
	it('names the papers snapshots point at that the table lacks', () => {
		expect(papersToAskFor({ held: ['a'], named: ['a', 'b'], askedFor: new Set() })).toEqual(['b']);
	});

	it('asks for a paper only once', () => {
		expect(papersToAskFor({ held: [], named: ['b', 'c'], askedFor: new Set(['b']) })).toEqual([
			'c'
		]);
	});

	it('names nothing while the table holds every paper', () => {
		expect(papersToAskFor({ held: ['a', 'b'], named: ['b'], askedFor: new Set() })).toEqual([]);
	});
});
