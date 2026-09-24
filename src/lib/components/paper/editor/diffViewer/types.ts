import type { PaperStatus$options } from '$houdini';

export interface VersionForComparison {
	id: string;
	version: number;
	content?: any;
	createdAt: string | Date;
	status?: PaperStatus$options | null;
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
