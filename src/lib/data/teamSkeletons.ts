import {
	block,
	field,
	fieldPair,
	formSection,
	line,
	managedTable,
	paragraph,
	smallButton,
	stat,
	table,
	tabs,
	times,
	toggle,
	type SkeletonLayout,
	type SkeletonNode
} from '#lib/components/navigation/skeletonShapes';

/**
 * The skeleton of every team page, drawn after the page it stands in for: its wrapper's classes,
 * then the sections it shows in the typical, populated state. When a page's layout changes, change
 * its skeleton here too. The route registry (`#lib/data/teamRoutes.ts`) names one per entry.
 */

/** A heading next to the buttons on its right */
const headerRow = ({
	title,
	actions
}: {
	title: SkeletonNode;
	actions: readonly SkeletonNode[];
}): SkeletonNode => ({
	class: 'flex flex-wrap items-center gap-3',
	children: [title, { class: 'ml-auto flex flex-wrap items-center gap-2', children: actions }]
});

/** The `alert` boxes pages keep at the top */
const alert = (height = 'h-14') => block(`${height} w-full`);

// --- Main ---------------------------------------------------------------------------------------

/** A stats widget: a `card bg-base-200` with its title, then its content */
const widget = ({ span, content }: { span: string; content: readonly SkeletonNode[] }) => ({
	class: `border-base-300 bg-base-200 rounded-box flex flex-col gap-4 border p-4 ${span}`,
	children: [block('h-5 w-40 rounded-full'), ...content]
});

const statRow = (count: number): SkeletonNode => ({
	class: count === 2 ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-3 gap-4',
	children: Array.from({ length: count }, (_, index) => stat(index))
});

const stats: SkeletonLayout = {
	name: 'stats',
	nodes: [
		{
			class: 'grid w-full grid-cols-2 gap-3 md:grid-cols-12',
			children: [
				widget({
					span: 'col-span-2 md:col-span-4',
					content: [block('h-10 w-full'), line({ height: 'h-3' })]
				}),
				widget({ span: 'col-span-2 md:col-span-4', content: [statRow(2)] }),
				widget({
					span: 'col-span-2 md:col-span-12',
					content: [
						{ class: 'grid grid-cols-2 gap-4 sm:grid-cols-4', children: times(4, stat(2)) },
						block('h-10 w-full')
					]
				}),
				widget({
					span: 'col-span-2 md:col-span-12',
					content: [
						statRow(3),
						{ class: 'grid gap-4 md:grid-cols-3', children: times(3, block('h-[220px] w-full')) }
					]
				}),
				widget({
					span: 'col-span-2 md:col-span-12 xl:col-span-8 xl:row-span-3',
					content: [
						statRow(3),
						block('h-[180px] w-full'),
						block('h-10 w-full'),
						...times(3, block('h-3 w-full rounded-full'))
					]
				}),
				widget({
					span: 'col-span-2 md:col-span-6 xl:col-span-4 xl:row-span-2',
					content: [statRow(2), statRow(2)]
				}),
				widget({
					span: 'col-span-2 md:col-span-6 xl:col-span-4 xl:row-span-2',
					content: [statRow(3), block('h-[200px] w-full')]
				})
			]
		}
	]
};

/** The settings' imagery: one drop zone, then two side by side */
const dropZones: SkeletonNode = {
	class: 'flex flex-col gap-4',
	children: [
		block('h-36 w-full'),
		{ class: 'grid gap-4 sm:grid-cols-2', children: [block('h-36 w-full'), block('h-36 w-full')] }
	]
};

const settings = {
	name: 'settings',
	nodes: [
		{
			class: 'bg-base-100 dark:bg-base-200 rounded-box flex w-full flex-col p-4 sm:p-8',
			children: [
				tabs({ count: 7, margin: 'mb-4' }),
				{
					class: 'mb-6 flex items-center gap-4',
					children: [block('h-4 max-w-md flex-1 rounded-full'), block('ml-auto h-8 w-8')]
				},
				formSection({ first: true, fields: [field(0), field(1), fieldPair(2), field(4)] }),
				formSection({ fields: [dropZones] }),
				formSection({ fields: [fieldPair(0), fieldPair(2), field(1)] }),
				block('mt-6 h-10 w-full')
			]
		}
	]
};

/** One row of the seats overview: the nation, then a seat button per committee */
const seatRow = (index: number): SkeletonNode => ({
	class: 'border-base-200 flex items-center gap-3 border-t py-2',
	children: [
		{
			class: 'flex w-40 shrink-0 items-center gap-2',
			children: [
				block('h-5 w-7'),
				{
					class: 'flex flex-col gap-1',
					children: [block('h-4 w-12'), block('h-3 w-20 rounded-full')]
				}
			]
		},
		...Array.from({ length: 8 }, (_, column) => ({
			class: `flex flex-1 justify-center ${column < 3 ? '' : column < 6 ? 'max-sm:hidden' : 'max-lg:hidden'}`,
			children: [block('h-8 w-10')]
		}))
	]
});

const seats = {
	name: 'seats',
	nodes: [
		{
			class: 'flex w-full flex-col items-start gap-10 py-4 sm:px-4',
			children: [
				{
					class: 'border-base-300 rounded-box flex items-center gap-3 border p-3',
					children: [toggle('w-28')]
				},
				{
					class: 'flex w-full flex-col',
					children: [
						{
							class: 'flex items-end gap-3 pb-2',
							children: [
								{ class: 'w-40 shrink-0', children: [] },
								...Array.from({ length: 8 }, (_, column) => ({
									class: `flex flex-1 flex-col items-center gap-1 ${column < 3 ? '' : column < 6 ? 'max-sm:hidden' : 'max-lg:hidden'}`,
									children: [block('h-5 w-10'), block('h-3 w-12 rounded-full')]
								}))
							]
						},
						...Array.from({ length: 10 }, (_, index) => seatRow(index))
					]
				}
			]
		}
	]
};

const participants = {
	name: 'participants',
	nodes: [
		{
			class: 'flex w-full flex-col',
			children: [managedTable({ toolbar: [smallButton('w-32'), smallButton('w-32')] })]
		}
	]
};

const waitingList = {
	name: 'waitingList',
	nodes: [
		{
			class: 'flex w-full flex-col',
			children: [managedTable({ toolbar: [toggle('w-36'), toggle('w-28')] })]
		}
	]
};

const schools = {
	name: 'schools',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4',
			children: [block('h-8 w-40'), paragraph({ lines: 2, width: 'max-w-prose' }), managedTable()]
		}
	]
};

/** The team management pages: their two tabs and the invite button, then the content */
const teamManagement = ({
	name,
	content
}: {
	name: string;
	content: SkeletonNode;
}): SkeletonLayout => ({
	name,
	nodes: [
		{
			class: 'flex w-full flex-col',
			children: [
				{
					class: 'flex flex-wrap items-end justify-between gap-4 pt-4 sm:px-6 sm:pt-6',
					children: [
						{
							class: 'flex h-10 items-center gap-8 mb-6 sm:h-12',
							children: [block('h-4 w-28 rounded-full'), block('h-4 w-36 rounded-full')]
						},
						block('mb-6 h-8 w-44')
					]
				},
				{ class: 'flex flex-col gap-4 py-4 sm:p-6 sm:pt-4', children: [content] }
			]
		}
	]
});

const members = teamManagement({ name: 'members', content: managedTable({ columns: 5 }) });

const invitations = teamManagement({
	name: 'invitations',
	content: {
		class: 'mt-8 flex flex-col gap-4',
		children: [block('h-6 w-48'), table({ rows: 4, columns: 6 })]
	}
});

/** A committee of the paper hub, collapsed: its abbreviation, name and status on the right */
const committeeCollapse: SkeletonNode = {
	class: 'bg-base-200 rounded-box flex h-14 items-center gap-3 p-4',
	children: [
		block('h-4 w-4'),
		block('h-5 w-12 rounded-full'),
		block('h-5 w-48 max-w-full'),
		{
			class: 'ml-auto flex items-center gap-2 max-sm:hidden',
			children: [block('h-5 w-16 rounded-full'), block('h-5 w-16 rounded-full'), block('h-4 w-10')]
		}
	]
};

const paperHub = {
	name: 'paperHub',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4 py-4 sm:p-6',
			children: [
				tabs({ count: 3, margin: 'mt-2' }),
				{
					class: 'flex flex-col gap-3',
					children: [
						{
							class: 'bg-base-200 rounded-box flex flex-col gap-4 p-4',
							children: [
								headerRow({
									title: block('h-5 w-40'),
									actions: [toggle('w-24'), smallButton('w-24')]
								}),
								block('h-9 w-full'),
								block('h-3 w-32 rounded-full'),
								{ class: 'flex flex-wrap gap-8', children: [stat(0), stat(1), stat(2)] }
							]
						},
						tabs({ count: 4, margin: '' }),
						...times(6, committeeCollapse)
					]
				}
			]
		}
	]
};

// --- Workflows ----------------------------------------------------------------------------------

const seatPlanningSidebarSection = (title: string): SkeletonNode => ({
	class: 'bg-base-200 rounded-box flex flex-col gap-2 p-3',
	children: [
		block(`h-3 rounded-full ${title}`),
		...Array.from({ length: 4 }, (_, index) => ({
			class: 'flex items-center gap-2',
			children: [block('h-3 w-16 rounded-full'), line({ index, height: 'h-3' })]
		}))
	]
});

/** A row of the seat matrix: the state, its regional group, a cell per committee, the sum */
const matrixRow = ({
	index,
	header = false
}: {
	index: number;
	header?: boolean;
}): SkeletonNode => ({
	class: `flex items-center gap-4 px-2 ${header ? 'border-base-200 border-b py-3' : 'py-2.5'}`,
	children: [
		block(`h-4 w-40 shrink-0 rounded-full ${header ? 'max-w-16' : ''}`),
		block(`h-4 w-28 shrink-0 rounded-full max-md:hidden ${header ? 'max-w-20' : ''}`),
		...Array.from({ length: 7 }, (_, column) => ({
			class: `flex flex-1 justify-center ${column < 3 ? '' : column < 5 ? 'max-sm:hidden' : 'max-lg:hidden'}`,
			children: [
				block(
					header ? 'h-3 w-8 rounded-full' : (index + column) % 3 ? 'h-6 w-8' : 'h-6 w-8 opacity-40'
				)
			]
		}))
	]
});

const seatPlanning = {
	name: 'seatPlanning',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4 py-4',
			children: [
				alert('h-20'),
				tabs({ count: 3, margin: '' }),
				{
					class: 'flex flex-col gap-4 xl:flex-row',
					children: [
						{
							class: 'flex min-w-0 grow flex-col gap-4',
							children: [
								{
									class: 'flex flex-wrap items-center gap-2',
									children: [
										block('h-10 min-w-48 grow'),
										block('h-10 w-36'),
										block('h-10 w-36'),
										toggle('w-28')
									]
								},
								{
									class: 'flex flex-col',
									children: [
										matrixRow({ index: 0, header: true }),
										...Array.from({ length: 12 }, (_, index) => matrixRow({ index }))
									]
								}
							]
						},
						{
							class: 'flex shrink-0 flex-col gap-4 xl:w-96',
							children: [
								block('h-6 w-20'),
								seatPlanningSidebarSection('w-28'),
								seatPlanningSidebarSection('w-36'),
								{
									class: 'bg-base-200 rounded-box flex flex-col gap-2 p-3',
									children: [
										block('h-3 w-24 rounded-full'),
										{
											class: 'grid grid-cols-2 gap-2',
											children: [block('h-8 w-full'), block('h-8 w-full')]
										}
									]
								}
							]
						}
					]
				}
			]
		}
	]
};

/** The assignment's frame: its intro and draft status, then its tabs, then the open tab's body */
const assignmentFrame = (body: SkeletonNode): SkeletonNode => ({
	class: 'flex w-full flex-col gap-4 py-4',
	children: [
		{
			class: 'flex flex-wrap items-start justify-between gap-4',
			children: [
				block('h-4 w-full max-w-3xl rounded-full'),
				{
					class: 'flex gap-2',
					children: [block('h-6 w-28 rounded-full'), block('h-6 w-24 rounded-full')]
				}
			]
		},
		tabs({ count: 6 }),
		body
	]
});

const textBlock = (index: number): SkeletonNode => ({
	class: 'flex flex-col gap-2',
	children: [block('h-3 w-24 rounded-full'), paragraph({ lines: 4, width: '' }), line({ index })]
});

/** The sighting: progress, filters, one application's card, and the deck's navigation */
const sightingBody: SkeletonNode = {
	class: 'flex flex-col gap-4',
	children: [
		alert('h-[4.5rem]'),
		{
			class: 'flex flex-wrap items-end gap-2',
			children: [
				block('h-10 w-56'),
				block('h-10 w-36'),
				block('h-10 w-48'),
				block('ml-auto h-4 w-24 rounded-full')
			]
		},
		{
			class:
				'border-base-200 rounded-box flex flex-col gap-6 overflow-hidden border p-6 sm:h-[46rem] sm:max-h-[75vh]',
			children: [
				headerRow({
					title: {
						class: 'flex flex-col gap-2',
						children: [block('h-7 w-64 max-w-full'), block('h-3 w-40 rounded-full')]
					},
					actions: [block('h-6 w-28 rounded-full'), ...times(3, block('h-10 w-10'))]
				}),
				{
					class: 'grid gap-x-8 gap-y-6 lg:grid-cols-3',
					children: [
						{
							class: 'flex flex-col gap-3',
							children: [
								block('h-3 w-24 rounded-full'),
								...Array.from({ length: 4 }, (_, index) => line({ index }))
							]
						},
						{
							class: 'flex flex-col gap-3',
							children: [block('h-3 w-20 rounded-full'), line({ index: 2 }), line({ index: 3 })]
						},
						{
							class: 'flex flex-col gap-3',
							children: [
								block('h-3 w-16 rounded-full'),
								...Array.from({ length: 5 }, (_, index) => ({
									class: 'flex items-center gap-2',
									children: [block('h-4 w-6'), line({ index })]
								}))
							]
						},
						{
							class: 'grid gap-x-8 gap-y-6 lg:col-span-3 lg:grid-cols-2',
							children: [textBlock(1), textBlock(4)]
						}
					]
				},
				{
					class: 'flex flex-col gap-2',
					children: [block('h-3 w-16 rounded-full'), block('h-16 w-full')]
				}
			]
		},
		{
			class: 'flex flex-col items-center gap-3',
			children: [
				block('h-2 w-full max-w-3xl rounded-full'),
				block('h-3 w-full max-w-3xl rounded-full'),
				{
					class: 'flex flex-wrap justify-center gap-2',
					children: [
						smallButton('w-24'),
						smallButton('w-16'),
						smallButton('w-24'),
						smallButton('w-36')
					]
				}
			]
		}
	]
};

const introductionBody: SkeletonNode = {
	class: 'flex flex-col gap-8',
	children: [
		{
			class: 'flex flex-col gap-2',
			children: [block('h-7 w-64 max-w-full'), paragraph({ lines: 2 })]
		},
		{
			class: 'flex flex-col gap-4',
			children: [
				block('h-6 w-40'),
				{
					class: 'grid gap-x-8 gap-y-4 md:grid-cols-3',
					children: times(3, {
						class: 'flex flex-col gap-2',
						children: [
							block('h-4 w-32 rounded-full'),
							paragraph({ lines: 3, height: 'h-3', width: '' })
						]
					})
				}
			]
		},
		{
			class: 'flex flex-col gap-5',
			children: [
				block('h-6 w-40'),
				...Array.from({ length: 5 }, (_, index) => ({
					class: 'flex gap-4',
					children: [
						block('h-7 w-6 shrink-0'),
						{
							class: 'flex grow flex-col gap-2',
							children: [block('h-4 w-48 max-w-full rounded-full'), line({ index, height: 'h-3' })]
						}
					]
				}))
			]
		}
	]
};

/** The weights: the form with its cards of factors, and the examples on the right */
const weightingBody: SkeletonNode = {
	class: 'flex flex-col gap-6 lg:flex-row',
	children: [
		{
			class: 'flex grow flex-col gap-4',
			children: [
				alert(),
				...times(3, {
					class: 'border-base-200 rounded-box grid gap-4 border p-4 md:grid-cols-2',
					children: [field(0), field(1)]
				}),
				block('h-10 w-32 self-end')
			]
		},
		{
			class: 'flex shrink-0 flex-col gap-4 lg:w-96',
			children: [
				{
					class: 'border-base-200 rounded-box flex flex-col gap-3 border p-6',
					children: [
						block('h-5 w-40 rounded-full'),
						paragraph({ lines: 2, height: 'h-3', width: '' }),
						...times(4, block('h-4 w-full rounded-full'))
					]
				},
				{
					class: 'border-base-200 rounded-box flex flex-col gap-3 border p-6',
					children: [
						block('h-5 w-40 rounded-full'),
						paragraph({ lines: 2, height: 'h-3', width: '' }),
						...times(3, block('h-8 w-full'))
					]
				}
			]
		}
	]
};

/** A seat of the board: a role's card with its seats */
const roleCard: SkeletonNode = {
	class: 'border-base-200 rounded-box flex flex-col gap-2 border p-3',
	children: [
		{
			class: 'flex items-center gap-2',
			children: [
				block('h-4 w-6'),
				block('h-4 w-24 rounded-full'),
				block('ml-auto h-4 w-10 rounded-full')
			]
		},
		block('h-14 w-full')
	]
};

/** The board: the pool on the left from `xl` on, the roles beside it */
const board = (pool: readonly SkeletonNode[]): SkeletonNode => ({
	class: 'flex flex-col gap-4 xl:flex-row',
	children: [
		{
			class: 'flex flex-col gap-4 xl:w-96 xl:shrink-0',
			children: [
				{
					class:
						'border-base-200 rounded-box flex flex-col gap-3 border p-3 xl:h-[max(28rem,calc(100dvh-24rem))]',
					children: [
						block('h-5 w-32 rounded-full'),
						block('h-10 w-full'),
						...times(5, block('h-16 w-full'))
					]
				},
				...pool
			]
		},
		{
			class:
				'grid grow grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] content-start items-start gap-3',
			children: times(12, roleCard)
		}
	]
});

const delegationsBody: SkeletonNode = {
	class: 'flex flex-col gap-4',
	children: [
		{
			class: 'flex flex-wrap items-center gap-3',
			children: [
				{ class: 'flex gap-1', children: times(5, block('h-8 w-12')) },
				toggle('w-32'),
				{ class: 'ml-auto flex gap-2', children: [smallButton('w-32'), smallButton('w-40')] }
			]
		},
		board([])
	]
};

const singlesBody: SkeletonNode = {
	class: 'flex flex-col gap-4',
	children: [alert('h-16'), board([block('h-24 w-full')])]
};

const finishBody: SkeletonNode = {
	class: 'flex flex-col gap-6',
	children: [
		{
			class: 'border-base-200 rounded-box flex flex-col gap-4 border p-4 sm:p-8',
			children: [
				headerRow({
					title: block('h-6 w-56'),
					actions: [smallButton('w-28'), smallButton('w-32')]
				}),
				{ class: 'grid grid-cols-2 gap-4 sm:grid-cols-5', children: times(5, stat(1)) },
				table({ rows: 6, columns: 5 })
			]
		}
	]
};

/** The body of each assignment tab, which the assignment layout shows below its tabs */
export const ASSIGNMENT_TAB_SKELETONS: Record<string, SkeletonLayout> = {
	introduction: { name: 'assignmentIntroduction', nodes: [introductionBody] },
	sighting: { name: 'assignmentSighting', nodes: [sightingBody] },
	weighting: { name: 'assignmentWeighting', nodes: [weightingBody] },
	singles: { name: 'assignmentSingles', nodes: [singlesBody] },
	delegations: { name: 'assignmentDelegations', nodes: [delegationsBody] },
	finish: { name: 'assignmentFinish', nodes: [finishBody] }
};

/** The whole assignment section, frame included, for the team shell to show on entering it */
const assignment = (tab: string): SkeletonLayout => {
	const body = ASSIGNMENT_TAB_SKELETONS[tab] ?? ASSIGNMENT_TAB_SKELETONS.sighting;
	return { name: body.name, nodes: [assignmentFrame(body.nodes[0])] };
};

/** A table of the check-in: its badge, the range of names, the count, and who sits there */
const binRow = (index: number): SkeletonNode => ({
	class: 'bg-base-100 flex flex-col gap-3 rounded-lg p-2 md:flex-row md:gap-6',
	children: [
		{
			class: 'flex items-center gap-4 md:w-96 md:shrink-0',
			children: [block('h-7 w-20 rounded-full'), block('h-6 w-32'), block('ml-auto h-8 w-10')]
		},
		{
			class:
				'border-base-300 grid grow gap-x-8 gap-y-2 sm:grid-cols-2 md:border-l md:ps-6 xl:grid-cols-3',
			children: Array.from({ length: 6 }, (_, cell) => line({ index: index + cell, height: 'h-4' }))
		}
	]
});

const checkIn = {
	name: 'checkIn',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 py-4 sm:px-4 md:p-8',
			children: [
				{
					class: 'bg-base-200 rounded-box flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:gap-10',
					children: [
						{
							class: 'flex grow flex-col gap-3',
							children: [block('h-6 w-48'), paragraph({ lines: 3, width: '' })]
						},
						{ class: 'md:w-72 md:shrink-0', children: [field(0)] }
					]
				},
				{
					class: 'bg-base-200 rounded-box flex flex-col gap-5 p-4 sm:p-5',
					children: [
						headerRow({ title: block('h-6 w-40'), actions: times(3, smallButton()) }),
						block('h-3 w-full rounded-full'),
						{
							class: 'flex flex-col gap-2',
							children: Array.from({ length: 5 }, (_, index) => binRow(index))
						}
					]
				}
			]
		}
	]
};

/** The scan pages' search: the input and its button */
const scanSearch: SkeletonNode = {
	class: 'flex w-full gap-1',
	children: [block('h-10 grow'), block('h-10 w-12')]
};

const postalRegistration = {
	name: 'postalRegistration',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4 md:gap-6 md:p-10',
			children: [
				block('h-4 w-full max-w-2xl rounded-full max-md:hidden'),
				block('h-8 w-8 self-end rounded-full md:hidden'),
				scanSearch,
				block('rounded-box h-32 w-full md:aspect-video md:h-auto md:max-h-[40vh] md:min-h-52')
			]
		}
	]
};

/** The scanned payments so far: a heading over a list */
const scanHistory: SkeletonNode = {
	class: 'flex flex-col gap-2',
	children: [
		block('h-4 w-20 rounded-full'),
		{
			class: 'border-base-200 rounded-box flex flex-col gap-3 border p-3',
			children: times(4, block('h-8 w-full'))
		}
	]
};

const payments = {
	name: 'payments',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 md:p-10',
			children: [
				paragraph({ lines: 2 }),
				alert(),
				scanSearch,
				{ class: 'grid grid-cols-1 items-start gap-6 lg:grid-cols-2', children: [scanHistory] }
			]
		}
	]
};

/** A session of the scanner: its state, name and details, and its actions */
const sessionRow = (index: number): SkeletonNode => ({
	class: 'flex items-center gap-3 px-3 py-2.5',
	children: [
		block('h-3 w-3 shrink-0 rounded-full'),
		{
			class: 'flex min-w-0 grow flex-col gap-2',
			children: [block('h-4 w-40 max-w-full rounded-full'), line({ index, height: 'h-3' })]
		},
		block('h-5 w-9 shrink-0 rounded-full max-sm:hidden'),
		block('h-8 w-8 shrink-0'),
		block('h-8 w-16 shrink-0')
	]
});

const attendance = {
	name: 'attendance',
	nodes: [
		{
			class: 'flex w-full min-w-0 flex-col gap-4 md:gap-6 md:p-10',
			children: [
				{
					class: 'flex flex-col gap-2',
					children: [
						headerRow({ title: block('h-5 w-24 rounded-full'), actions: [smallButton('w-36')] }),
						{
							class: 'bg-base-200 rounded-box divide-base-300 flex flex-col divide-y',
							children: Array.from({ length: 6 }, (_, index) => sessionRow(index))
						},
						block('h-3 w-80 max-w-full rounded-full')
					]
				}
			]
		}
	]
};

// --- Information --------------------------------------------------------------------------------

const announcement = {
	name: 'announcement',
	nodes: [
		{
			class: 'flex w-full flex-col gap-4',
			children: [
				paragraph({ lines: 2 }),
				alert('mb-6 h-12'),
				{
					class: 'border-base-300 bg-base-200 rounded-box flex flex-col gap-4 border p-4',
					children: [
						block('h-4 w-12 rounded-full'),
						{
							class: 'grid grid-cols-1 gap-4 lg:grid-cols-2',
							children: [
								{
									class: 'flex flex-col gap-2',
									children: [block('h-3 w-24 rounded-full'), block('h-64 w-full lg:h-96')]
								},
								{
									class: 'flex flex-col gap-2',
									children: [block('h-3 w-20 rounded-full'), block('h-64 w-full lg:h-96')]
								}
							]
						},
						toggle('w-40'),
						block('h-3 w-64 max-w-full rounded-full')
					]
				},
				block('mt-6 h-10 w-24')
			]
		}
	]
};

/** A day of the calendar: its name and date over its track, then its entries */
const calendarDay = ({
	entries,
	hidden = ''
}: {
	entries: readonly string[];
	hidden?: string;
}) => ({
	header: {
		class: `border-base-200 flex flex-1 flex-col gap-1 border-l p-2 ${hidden}`,
		children: [
			block('h-4 w-20 rounded-full'),
			block('h-3 w-16 rounded-full'),
			block('mt-auto h-4 w-full')
		]
	},
	body: {
		class: `border-base-200 flex flex-1 flex-col gap-3 border-l p-2 ${hidden}`,
		children: entries.map((entry) => block(`w-full ${entry}`))
	}
});

const calendarDays = [
	calendarDay({ entries: ['mt-8 h-24', 'h-16', 'mt-6 h-20'] }),
	calendarDay({ entries: ['mt-20 h-32', 'h-12'], hidden: 'max-sm:hidden' }),
	calendarDay({ entries: ['h-14', 'mt-10 h-20', 'h-16'], hidden: 'max-lg:hidden' })
];

const calendar = {
	name: 'calendar',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 py-4 sm:px-4',
			children: [
				tabs({ count: 3, margin: '' }),
				headerRow({ title: block('h-4 w-72 max-w-full rounded-full'), actions: [toggle('w-24')] }),
				{
					class: 'border-base-200 rounded-box flex flex-col overflow-hidden border',
					children: [
						{
							class: 'border-base-200 flex h-16 border-b',
							children: [
								{ class: 'w-14 shrink-0', children: [] },
								...calendarDays.map((day) => day.header)
							]
						},
						{
							class: 'flex h-[32rem]',
							children: [
								{
									class: 'flex w-14 shrink-0 flex-col gap-14 p-2',
									children: times(8, block('h-3 w-8 rounded-full'))
								},
								...calendarDays.map((day) => day.body)
							]
						}
					]
				}
			]
		}
	]
};

/** A survey's card: its title and actions, its donut and figures, its options, its switch */
const surveyCard: SkeletonNode = {
	class: 'border-base-300 bg-base-200/50 rounded-box flex flex-col gap-5 border p-4 sm:p-5',
	children: [
		{
			class: 'flex flex-col gap-3 lg:flex-row lg:justify-between',
			children: [
				{
					class: 'flex grow flex-col gap-2',
					children: [
						block('h-7 w-56 max-w-full'),
						paragraph({ lines: 2, height: 'h-3', width: 'max-w-xl' })
					]
				},
				{ class: 'flex gap-2', children: times(3, smallButton('w-20')) }
			]
		},
		{
			class: 'flex flex-col gap-5 sm:flex-row',
			children: [
				block('size-32 shrink-0 rounded-full'),
				{
					class: 'grid shrink-0 grid-cols-2 gap-3 sm:w-64',
					children: times(2, block('h-14 w-full'))
				},
				{
					class: 'flex grow flex-col gap-3',
					children: Array.from({ length: 3 }, (_, index) => ({
						class: 'flex flex-col gap-2',
						children: [line({ index, height: 'h-3' }), block('h-1.5 w-full rounded-full')]
					}))
				}
			]
		},
		{
			class:
				'border-base-300 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
			children: [toggle('w-48'), smallButton('w-28')]
		}
	]
};

const survey = {
	name: 'survey',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 py-4 sm:px-4',
			children: [
				{ class: 'flex sm:justify-end', children: [block('h-10 w-40')] },
				surveyCard,
				surveyCard,
				block('h-14 w-full')
			]
		}
	]
};

const chartCard = ({ chart, span = '' }: { chart: string; span?: string }): SkeletonNode => ({
	class: `border-base-200 rounded-box flex flex-col gap-4 border p-6 ${span}`,
	children: [block('h-5 w-32 rounded-full'), block(`w-full ${chart}`)]
});

const surveyDetail = {
	name: 'surveyDetail',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 py-4 sm:px-4',
			children: [
				{
					class: 'border-base-300 flex flex-wrap items-center gap-3 border-b pb-4',
					children: [
						block('h-8 w-8'),
						block('h-8 w-64 max-w-full'),
						{ class: 'ml-auto flex gap-2', children: [smallButton('w-24'), smallButton('w-24')] }
					]
				},
				tabs({ count: 2, margin: '' }),
				{
					class: 'grid gap-4 lg:grid-cols-3',
					children: [
						chartCard({ chart: 'h-[160px]' }),
						chartCard({ chart: 'h-[200px]' }),
						chartCard({ chart: 'h-[200px]' })
					]
				},
				chartCard({ chart: 'h-[250px]' }),
				{
					class: 'flex flex-col gap-3',
					children: [
						headerRow({ title: block('h-6 w-32'), actions: [smallButton('w-28')] }),
						...times(4, block('h-14 w-full'))
					]
				}
			]
		}
	]
};

// --- Maintenance --------------------------------------------------------------------------------

/** A check of the plausibility page: its headline and count, its rule, what it found */
const plausibilityCheck = (index: number): SkeletonNode => ({
	class: 'bg-base-200 rounded-box flex flex-col gap-3 p-4',
	children: [
		{
			class: 'flex items-center gap-3',
			children: [
				block('h-7 w-7'),
				block('h-6 w-48 max-w-full rounded-full'),
				block('ml-auto h-8 w-10')
			]
		},
		line({ index, height: 'h-3' }),
		...Array.from({ length: 3 }, (_, item) => line({ index: index + item + 2 }))
	]
});

/** A possible duplicate: the two accounts side by side, field by field */
const duplicatePair: SkeletonNode = {
	class: 'bg-base-200 rounded-box flex flex-col gap-3 p-3',
	children: [
		{
			class: 'flex items-center gap-4',
			children: [
				block('size-12 shrink-0 rounded-full'),
				...times(2, {
					class: 'flex flex-1 flex-col gap-2',
					children: [block('h-4 w-32 max-w-full'), block('h-3 w-24 rounded-full')]
				})
			]
		},
		...Array.from({ length: 6 }, (_, index) => ({
			class: 'flex items-center gap-4',
			children: [block('h-4 w-4 shrink-0'), line({ index }), line({ index: index + 3 })]
		})),
		{ class: 'flex justify-end gap-2', children: [block('h-6 w-20'), block('h-6 w-20')] }
	]
};

const plausibility = {
	name: 'plausibility',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6 py-4 sm:p-6',
			children: [
				{
					class: 'grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3',
					children: Array.from({ length: 6 }, (_, index) => plausibilityCheck(index))
				},
				{
					class: 'flex flex-col gap-4',
					children: [
						headerRow({ title: block('h-8 w-64 max-w-full'), actions: [smallButton('w-24')] }),
						paragraph({ lines: 1 }),
						{ class: 'grid gap-4 lg:grid-cols-2', children: [duplicatePair, duplicatePair] }
					]
				}
			]
		}
	]
};

/** The pages of the maintenance section: an intro, then sections of a heading, a line, content */
const maintenancePage = ({
	name,
	sections
}: {
	name: string;
	sections: readonly SkeletonNode[];
}): SkeletonLayout => ({
	name,
	nodes: [
		{
			class: 'flex w-full flex-col gap-8 py-4 sm:p-10',
			children: [paragraph({ lines: 2 }), ...sections]
		}
	]
});

const maintenanceSection = (content: readonly SkeletonNode[]): SkeletonNode => ({
	class: 'flex flex-col gap-2',
	children: [block('h-7 w-56 max-w-full'), paragraph({ lines: 1 }), ...content]
});

/** The school suggestions of the cleanup: the variants to merge, with their buttons */
const schoolSuggestion: SkeletonNode = {
	class: 'border-base-300 bg-base-200 rounded-box flex flex-col border',
	children: [
		{
			class: 'border-base-300 flex items-center gap-3 border-b px-4 py-3',
			children: [
				{
					class: 'flex grow flex-col gap-2',
					children: [block('h-4 w-40'), block('h-3 w-64 max-w-full rounded-full')]
				},
				block('h-8 w-8 rounded-full'),
				block('h-4 w-10 rounded-full'),
				block('h-8 w-8 rounded-full')
			]
		},
		{
			class: 'flex flex-col gap-3 px-4 py-3',
			children: Array.from({ length: 3 }, (_, index) => ({
				class: 'flex items-center gap-3',
				children: [
					block('h-4 w-4 rounded-full'),
					line({ index }),
					block('ml-auto h-3 w-10 rounded-full')
				]
			}))
		},
		{
			class: 'border-base-300 flex justify-end gap-2 border-t px-4 py-2',
			children: times(3, smallButton('w-24'))
		}
	]
};

const cleanup = {
	name: 'cleanup',
	nodes: [
		{
			class: 'flex w-full min-w-0 flex-col gap-8 py-4 sm:gap-10 sm:p-10',
			children: [
				paragraph({ lines: 2 }),
				maintenanceSection([
					{
						class: 'mt-4 flex flex-col gap-4',
						children: [
							schoolSuggestion,
							{
								class: 'flex flex-col gap-2 sm:flex-row',
								children: [block('h-10 flex-1'), block('h-10 w-40')]
							},
							managedTable({ filters: false, columns: 4 })
						]
					}
				])
			]
		}
	]
};

const helper = maintenancePage({
	name: 'helper',
	sections: [
		maintenanceSection([
			{
				class: 'flex flex-col gap-1 sm:flex-row',
				children: [block('h-10 w-36'), block('h-10 w-36')]
			}
		])
	]
});

const importPage = maintenancePage({
	name: 'import',
	sections: [maintenanceSection([block('mt-4 h-10 w-full')])]
});

/** A category of downloads: its icon and title in the header, its download tiles below */
const downloadCategory = (tiles: number): SkeletonNode => ({
	class: 'border-base-200 rounded-box flex flex-col overflow-hidden border',
	children: [
		{
			class: 'border-base-200 flex items-center gap-4 border-b px-4 py-4 sm:px-6 sm:py-5',
			children: [
				block('size-12 shrink-0'),
				{
					class: 'flex grow flex-col gap-2',
					children: [block('h-5 w-48 max-w-full'), block('h-3 w-72 max-w-full rounded-full')]
				}
			]
		},
		{
			class: 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3',
			children: times(tiles, block('h-[3.25rem] w-full'))
		}
	]
});

const downloads = {
	name: 'downloads',
	nodes: [
		{
			class: 'mx-auto flex w-full max-w-6xl flex-col gap-6 py-4 sm:p-6 md:p-10',
			children: [
				paragraph({ lines: 2, height: 'h-5' }),
				{
					class: 'border-base-200 rounded-box flex items-center gap-4 border px-6 py-5',
					children: [
						block('size-12 shrink-0'),
						block('h-4 w-40 rounded-full'),
						block('h-5 w-16 rounded-full')
					]
				},
				downloadCategory(6),
				downloadCategory(4),
				downloadCategory(1)
			]
		}
	]
};

// --- Pages below the entries --------------------------------------------------------------------

/** A person's card as a page: back and name, then the card's header, tabs and sections */
const userPage = {
	name: 'user',
	nodes: [
		{
			class: 'mx-auto flex w-full max-w-5xl flex-col',
			children: [
				{ class: 'mb-3 flex items-center gap-2', children: [block('h-8 w-20'), block('h-7 w-48')] },
				{
					class: 'flex flex-col gap-4',
					children: [
						{
							class: 'border-base-200 rounded-box flex flex-col gap-4 border p-4',
							children: [
								{
									class: 'flex items-center gap-4',
									children: [
										block('h-14 w-14 shrink-0 rounded-full'),
										{
											class: 'flex grow flex-col gap-2',
											children: [
												block('h-7 w-56 max-w-full sm:h-9'),
												block('h-3 w-40 rounded-full')
											]
										},
										block('h-8 w-8'),
										block('h-8 w-8')
									]
								},
								{
									class: 'flex flex-wrap gap-2',
									children: times(5, block('h-6 w-24 rounded-full'))
								}
							]
						},
						{ class: 'flex gap-4', children: times(5, block('h-5 w-12 rounded-full sm:w-20')) },
						block('h-24 w-full'),
						block('h-24 w-full')
					]
				}
			]
		}
	]
};

const schoolPage = {
	name: 'school',
	nodes: [
		{
			class: 'flex w-full flex-col gap-6',
			children: [
				{
					class: 'flex flex-col gap-2',
					children: [
						block('h-4 w-20 rounded-full'),
						block('h-8 w-64 max-w-full'),
						block('h-4 w-32 rounded-full')
					]
				},
				block('h-6 w-32'),
				{
					class:
						'border-base-200 rounded-box divide-base-200 grid divide-y border lg:grid-cols-5 lg:divide-x lg:divide-y-0',
					children: Array.from({ length: 5 }, (_, index) => ({
						class: 'p-4',
						children: [stat(index)]
					}))
				},
				table({ rows: 3, columns: 7 }),
				{
					class: 'border-base-200 rounded-box flex flex-col border p-6',
					children: [
						formSection({ first: true, fields: [field(0)] }),
						formSection({ fields: [field(1), fieldPair(2), fieldPair(0)] }),
						formSection({ fields: [field(3), fieldPair(1)] })
					]
				}
			]
		}
	]
};

/** The skeleton of every page the registry names, by the entry's id */
export const TEAM_SKELETONS = {
	stats,
	settings,
	seats,
	participants,
	waitingList,
	schools,
	members,
	paperHub,
	seatPlanning,
	assignment: assignment('sighting'),
	checkIn,
	postalRegistration,
	payments,
	attendance,
	announcement,
	calendar,
	survey,
	plausibility,
	cleanup,
	helper,
	import: importPage,
	downloads
} satisfies Record<string, SkeletonLayout>;

/**
 * Pages below an entry whose layout is not the entry's: a detail page (`team/schools/<id>`) or a
 * page the entry owns (`team/invitations`). Matched by prefix of the path relative to the
 * conference's dashboard; the assignment's tabs are matched by their name.
 */
const SUBPAGE_SKELETONS: readonly { prefix: string; skeleton: SkeletonLayout }[] = [
	{ prefix: 'team/invitations', skeleton: invitations },
	{ prefix: 'team/user/', skeleton: userPage },
	{ prefix: 'team/schools/', skeleton: schoolPage },
	{ prefix: 'team/survey/', skeleton: surveyDetail }
];

/** The skeleton of a page below an entry, if it has one of its own */
export function teamSubpageSkeleton(relativePath: string): SkeletonLayout | undefined {
	const assignmentTab = /^team\/assignment\/([^/]+)/.exec(relativePath)?.[1];
	if (assignmentTab) return assignment(assignmentTab);
	if (relativePath === 'team/assignment') return assignment('sighting');
	return SUBPAGE_SKELETONS.find(({ prefix }) => relativePath.startsWith(prefix))?.skeleton;
}
