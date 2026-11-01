import { describe, expect, test } from 'vitest';
import { matrixRows } from './paperMatrixRows';

const paper = (id: string, delegationId: string) => ({ id, delegation: { id: delegationId } });

describe('matrixRows', () => {
	test('one row per delegation, sorted by name, with papers in their column', () => {
		const rows = matrixRows({
			columns: [
				{ id: 'topic-1', papers: [paper('p1', 'b'), paper('p2', 'a'), paper('p3', 'b')] },
				{ id: 'topic-2', papers: [paper('p4', 'b')] }
			],
			nameOf: (p) => (p.delegation.id === 'a' ? 'Austria' : 'Belgium')
		});

		expect(rows.map((row) => row.name)).toEqual(['Austria', 'Belgium']);
		expect(rows[1].cells.get('topic-1')?.map((p) => p.id)).toEqual(['p1', 'p3']);
		expect(rows[1].cells.get('topic-2')?.map((p) => p.id)).toEqual(['p4']);
		expect(rows[0].cells.get('topic-2')).toBeUndefined();
	});

	test('no papers, no rows', () => {
		expect(matrixRows({ columns: [{ id: 'topic-1', papers: [] }], nameOf: () => '' })).toEqual([]);
	});
});
