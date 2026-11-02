/**
 * The rough layout a page's skeleton imitates while the page loads. Picked per page (the team
 * route registry names one for each entry), so the placeholder already has the shape of what
 * replaces it and nothing jumps when the data arrives.
 */
export type SkeletonShape = 'page' | 'table' | 'cards' | 'form' | 'dashboard';

/** One row of grey blocks: the row's layout classes, and the classes of each block in it */
export interface SkeletonRow {
	row: string;
	blocks: readonly string[];
}

const times = (count: number, block: string) => Array.from({ length: count }, () => block);
/** Varied widths so rows of text do not look like a grid of identical bars */
const WIDTHS = ['w-7/12', 'w-5/12', 'w-8/12', 'w-4/12', 'w-6/12', 'w-9/12'];
const line = (index: number) => `h-4 rounded-full ${WIDTHS[index % WIDTHS.length]}`;
const lines = (count: number, from = 0) => Array.from({ length: count }, (_, i) => line(from + i));

const TOOLBAR: SkeletonRow = {
	row: 'flex flex-wrap items-center gap-3',
	blocks: ['h-10 w-64 max-w-full', 'h-10 w-28', 'ml-auto h-10 w-10', 'h-10 w-10']
};
const TITLE_ROW: SkeletonRow = {
	row: 'flex items-center gap-3',
	blocks: ['h-8 w-56 max-w-full', 'ml-auto h-10 w-32']
};
/** A table row: five cells of text, each in its own column */
const tableRow = (index: number): SkeletonRow => ({
	row: 'grid grid-cols-5 gap-6 px-2 py-1',
	blocks: lines(5, index)
});
const formField = (index: number): SkeletonRow => ({
	row: 'flex flex-col gap-2',
	blocks: [`h-3 rounded-full ${WIDTHS[index % WIDTHS.length]}`, 'h-10 w-full']
});

/** What each shape draws, top to bottom */
export const SKELETON_LAYOUTS: Record<SkeletonShape, readonly SkeletonRow[]> = {
	page: [
		{ row: '', blocks: ['h-8 w-72 max-w-full'] },
		{ row: 'flex flex-col gap-3', blocks: lines(3) },
		{ row: '', blocks: ['h-48 w-full'] },
		{ row: '', blocks: ['h-32 w-full'] }
	],
	table: [
		TOOLBAR,
		{ row: 'grid grid-cols-5 gap-6 px-2', blocks: times(5, 'h-4 rounded-full') },
		...Array.from({ length: 8 }, (_, index) => tableRow(index))
	],
	cards: [
		TITLE_ROW,
		{ row: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', blocks: times(6, 'h-40 w-full') }
	],
	form: [
		{ row: '', blocks: ['h-8 w-56 max-w-full'] },
		{ row: 'border-base-300 rounded-box border p-4', blocks: ['h-5 w-40'] },
		...Array.from({ length: 3 }, (_, index) => formField(index)),
		{ row: 'border-base-300 rounded-box border p-4', blocks: ['h-5 w-40'] },
		...Array.from({ length: 3 }, (_, index) => formField(3 + index)),
		{ row: 'flex justify-end', blocks: ['h-10 w-32'] }
	],
	dashboard: [
		{
			row: 'grid grid-cols-2 gap-3 md:grid-cols-12',
			blocks: [
				'col-span-2 h-24 md:col-span-8',
				'col-span-2 h-24 md:col-span-4',
				'col-span-2 h-64 md:col-span-6',
				'col-span-2 h-64 md:col-span-6',
				'col-span-2 h-48 md:col-span-4',
				'col-span-2 h-48 md:col-span-4',
				'col-span-2 h-48 md:col-span-4'
			]
		}
	]
};
