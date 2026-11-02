/**
 * What a page's skeleton draws while the page loads, so the placeholder already has the shape of
 * what replaces it and nothing jumps when the data arrives. A layout is a tree: a node with
 * `children` is a plain element (a card's frame, a row, a grid), one without is a grey block.
 * Classes are the page's own where they can be (its wrapper, grids, breakpoints), so the skeleton
 * reflows like the page does. Class strings are written out whole: Tailwind only finds literal ones.
 *
 * The team pages' layouts are in `#lib/data/teamSkeletons`; the building blocks here are shared.
 */
export interface SkeletonNode {
	class: string;
	children?: readonly SkeletonNode[];
}

export interface SkeletonLayout {
	/** Shown as `data-skeleton`, for tests and the inspector */
	name: string;
	nodes: readonly SkeletonNode[];
}

export const block = (classes: string): SkeletonNode => ({ class: classes });

export const times = (count: number, node: SkeletonNode): SkeletonNode[] =>
	Array.from({ length: count }, () => node);

/** Varied widths so rows of text do not look like a grid of identical bars */
const WIDTHS = ['w-7/12', 'w-5/12', 'w-8/12', 'w-4/12', 'w-6/12', 'w-9/12'];

/** A line of text: `h-4` for body text, `h-3` for small print */
export const line = ({ index = 0, height = 'h-4' }: { index?: number; height?: string } = {}) =>
	block(`${height} rounded-full ${WIDTHS[index % WIDTHS.length]}`);

/** A paragraph: full-width lines, the last one shorter */
export const paragraph = ({
	lines = 2,
	height = 'h-4',
	width = 'max-w-3xl'
}: { lines?: number; height?: string; width?: string } = {}): SkeletonNode => ({
	class: `flex w-full flex-col gap-2 ${width}`,
	children: Array.from({ length: lines }, (_, index) =>
		block(`${height} rounded-full ${index === lines - 1 ? 'w-7/12' : 'w-full'}`)
	)
});

/** A daisyUI `Tabs` row (`#lib/components/tabs/Tabs.svelte`, which brings its own `mb-6`) */
export const tabs = ({ count, margin = 'mb-6' }: { count: number; margin?: string }) => ({
	class: `border-base-300 flex h-10 items-center gap-8 overflow-hidden border-b px-2 sm:h-12 ${margin}`,
	children: times(count, block('h-4 w-6 shrink-0 rounded-full sm:w-24'))
});

const LABEL_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28'];

/** A labelled input: the label above, the field below */
export const field = (index = 0): SkeletonNode => ({
	class: 'flex w-full flex-col gap-2',
	children: [
		block(`h-3 rounded-full ${LABEL_WIDTHS[index % LABEL_WIDTHS.length]}`),
		block('h-10 w-full')
	]
});

/** A toggle with its label */
export const toggle = (label = 'w-32'): SkeletonNode => ({
	class: 'flex items-center gap-2',
	children: [block('h-5 w-9 rounded-full'), block(`h-4 rounded-full ${label}`)]
});

/** A daisyUI `stat`: its title over its value */
export const stat = (index = 0): SkeletonNode => ({
	class: 'flex flex-col gap-2',
	children: [
		block(`h-3 rounded-full ${LABEL_WIDTHS[index % LABEL_WIDTHS.length]}`),
		block('h-7 w-16')
	]
});

/**
 * One of the settings forms' `FormSection`s: the icon and title on the left from `md` on, the
 * fields on the right. The first section of a form has no rule above it.
 */
export const formSection = ({
	fields,
	first = false
}: {
	fields: readonly SkeletonNode[];
	first?: boolean;
}): SkeletonNode => ({
	class: first
		? 'grid gap-4 pb-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8'
		: 'border-base-200 grid gap-4 border-t py-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8',
	children: [
		{
			class: 'flex items-center gap-3 md:flex-col md:items-start',
			children: [block('size-9 rounded-full'), block('h-4 w-28 rounded-full')]
		},
		{ class: 'flex flex-col gap-4', children: fields }
	]
});

/** Two fields side by side from `sm` on */
export const fieldPair = (index = 0): SkeletonNode => ({
	class: 'grid gap-4 sm:grid-cols-2',
	children: [field(index), field(index + 1)]
});

/**
 * Table cells that leave the narrow screens as the real table scrolls them out of view: the first
 * three columns always show, then up to five from `sm` and seven from `lg`.
 */
const cellVisibility = (index: number) =>
	index < 3 ? '' : index < 5 ? 'max-sm:hidden' : 'max-lg:hidden';

/** A plain table: a header row, then rows of text cells */
export const table = ({ rows = 8, columns = 6 }: { rows?: number; columns?: number } = {}) => ({
	class: 'flex w-full flex-col',
	children: [
		{
			class: 'border-base-200 flex gap-6 border-b px-4 py-3',
			children: Array.from({ length: columns }, (_, index) => ({
				class: `min-w-0 flex-1 ${cellVisibility(index)}`,
				children: [block('h-3 w-16 max-w-full rounded-full')]
			}))
		},
		...Array.from({ length: rows }, (_, row) => ({
			class: 'flex gap-6 px-4 py-3.5',
			children: Array.from({ length: columns }, (_, index) => ({
				class: `min-w-0 flex-1 ${cellVisibility(index)}`,
				children: [line({ index: row + index })]
			}))
		}))
	]
});

/**
 * A `ManagedTable`: the search and its toolbar, the table, the pagination. `toolbar` are the
 * page's own controls between the search and the filter button.
 */
export const managedTable = ({
	toolbar = [],
	filters = true,
	rows = 10,
	columns = 7
}: {
	toolbar?: readonly SkeletonNode[];
	filters?: boolean;
	rows?: number;
	columns?: number;
} = {}): SkeletonNode => ({
	class: 'flex min-w-0 flex-col',
	children: [
		{
			class: 'flex min-w-0 flex-wrap items-center gap-2',
			children: [
				block('h-10 grow basis-full sm:basis-auto'),
				...toolbar,
				...(filters ? [block('h-8 w-24')] : []),
				block('h-8 w-24'),
				{
					class: 'flex items-center gap-2 max-sm:ml-auto',
					children: [block('h-4 w-16 rounded-full'), block('h-8 w-8'), block('h-8 w-8')]
				}
			]
		},
		{
			class: 'mt-4 flex min-w-0 flex-col',
			children: [
				table({ rows, columns }),
				{
					class: 'flex flex-wrap items-center justify-between gap-4 px-2 py-3',
					children: [
						block('h-4 w-24 rounded-full'),
						{ class: 'flex items-center gap-4', children: [block('h-8 w-16'), block('h-8 w-44')] }
					]
				}
			]
		}
	]
});

/** A button of the toolbar row, `btn-sm` */
export const smallButton = (width = 'w-28') => block(`h-8 ${width}`);

/** Any page without a layout of its own: a title, a paragraph, two blocks of content */
export const PAGE_SKELETON: SkeletonLayout = {
	name: 'page',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4 py-4',
			children: [
				block('h-8 w-72 max-w-full'),
				paragraph({ lines: 3 }),
				block('h-48 w-full'),
				block('h-32 w-full')
			]
		}
	]
};

/** A conference's dashboard: a header, two wide cards, a row of three */
export const DASHBOARD_SKELETON: SkeletonLayout = {
	name: 'dashboard',
	nodes: [
		{
			class: 'grid w-full grid-cols-2 gap-3 py-4 md:grid-cols-12',
			children: [
				block('col-span-2 h-24 md:col-span-8'),
				block('col-span-2 h-24 md:col-span-4'),
				block('col-span-2 h-64 md:col-span-6'),
				block('col-span-2 h-64 md:col-span-6'),
				block('col-span-2 h-48 md:col-span-4'),
				block('col-span-2 h-48 md:col-span-4'),
				block('col-span-2 h-48 md:col-span-4')
			]
		}
	]
};
