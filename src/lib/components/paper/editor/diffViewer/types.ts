import type { PaperstatusEnum } from '$lib/api/rumbleClient/client';

export interface VersionForComparison {
	id: string;
	version: number;
	content?: any;
	createdAt: string | Date;
	status?: PaperstatusEnum | null;
}

export interface DiffSegment {
	text: string;
	type: 'equal' | 'insert' | 'delete';
}

export interface DiffResult {
	beforeSegments: DiffSegment[];
	afterSegments: DiffSegment[];
}

export interface ComparisonState {
	baseVersion: VersionForComparison | null;
	compareVersion: VersionForComparison | null;
	isSelecting: boolean;
}
