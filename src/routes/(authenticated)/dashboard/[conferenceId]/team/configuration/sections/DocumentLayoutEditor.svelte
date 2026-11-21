<script lang="ts">
	import { logger } from '#lib/logger';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { PAPER_FIELDS } from '#lib/paperScan/fields';
	import { snapRect, type SnapGuides } from '#lib/helpers/layoutSnap';
	import Modal from '#lib/components/Modal.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import {
		defaultLayout,
		dragPlacement,
		elementsByShape,
		elementsOf,
		coversFixedArea,
		fieldMinimum,
		minSquareSize,
		movePlacement,
		placementRect,
		POINTS_PER_MM,
		resizePlacement,
		resizeText,
		withMinimumSizes,
		resolveDocumentLayout,
		type BoxPlacement,
		type FieldPlacement,
		type LayoutDocument,
		type SquarePlacement,
		type TextPlacement
	} from '#lib/helpers/documentLayout';
	import { elementLabel, elementSample, templateField, type LayoutElement } from './layoutElements';
	import { renderTemplatePage } from './templatePage';
	import LayoutBoxElement from './LayoutBoxElement.svelte';
	import LayoutFieldElement from './LayoutFieldElement.svelte';
	import LayoutFieldPages from './LayoutFieldPages.svelte';
	import LayoutGuides from './LayoutGuides.svelte';
	import LayoutPager from './LayoutPager.svelte';
	import LayoutFontSizes from './LayoutFontSizes.svelte';
	import LayoutSquareElement from './LayoutSquareElement.svelte';
	import LayoutTextElement from './LayoutTextElement.svelte';

	type Placement = TextPlacement | BoxPlacement | SquarePlacement | FieldPlacement;
	type Layout = Record<string, Placement>;

	/**
	 * Places a document's generated parts on the conference's own template: a page of it is drawn,
	 * and every part is a box on it to drag - boxes and codes also resize from their bottom right
	 * corner, texts change size below. The same editor serves the certificate and the postal
	 * documents; what each has comes from `DOCUMENT_ELEMENTS`. A certificate's session list shows the
	 * conference's sessions; while no session is kept on the certificates, it is left off and a hint
	 * links where they are chosen (its placement stays stored). Where the conference reads its paper
	 * (`scanning`), the alignment marks show fixed and the fields to read sit on a page each, which a
	 * template of several pages is paged through for; the texts are on the first page, the footer on
	 * every one.
	 */
	interface Props {
		conferenceId: string;
		document: LayoutDocument;
		title: string;
		/** The sessions the certificates list (`certificateSampleSessions`). */
		certificateSessions: string[];
		/** Whether the conference reads its paper (`paperScanning`, as the form has it). */
		scanning: boolean;
		/** Prints a sample of the document as laid out here, before it is saved. */
		testPrint: (layout: Layout) => Promise<void>;
		onclose: () => void;
	}

	let { conferenceId, document, title, certificateSessions, scanning, testPrint, onclose }: Props =
		$props();

	// Seeded once: re-reading the conference while someone drags would throw their placement away.
	const stored = await client.query.conference({
		__args: { id: untrack(() => conferenceId) },
		certificateFile: { url: true },
		contractFile: { url: true },
		guardianConsentFile: { url: true },
		mediaConsentFile: { url: true },
		documentLayouts: true
	});
	const kind = untrack(() => document);
	const templateUrl = stored[templateField[kind]]?.url;
	const withFields = untrack(() => scanning);
	const elements = elementsOf(kind, { scanning: withFields });
	/** A certificate without sessions to list has no list to place. */
	const withoutSessions = $derived(kind === 'certificate' && certificateSessions.length === 0);
	const shown = $derived(
		withoutSessions ? elements.filter((element) => element.id !== 'sessions') : elements
	);
	const isLayoutElement = (id: string): id is LayoutElement => Object.hasOwn(elementLabel, id);

	let layout = $state<Layout>(
		resolveDocumentLayout({ document: kind, stored: stored.documentLayouts })
	);
	let open = $state(true);
	let canvas = $state<HTMLCanvasElement>();
	let frame = $state<HTMLDivElement>();
	let frameWidth = $state(0);
	/** The template page's size in points, known once it is drawn. */
	let page = $state<{ width: number; height: number }>();
	/** The page drawn (from 0) and how many the template has. */
	let pageIndex = $state(0);
	let pageCount = $state(1);
	let rendering = $state(false);

	const aspect = $derived(page ? page.width / page.height : 595 / 842);
	const pageWidth = $derived(page?.width ?? 595);
	/** The layout as it will print: codes at least their minimum size on this template. */
	const placed = $derived(withMinimumSizes({ document: kind, layout, pageWidth }));
	/** The smallest side of the document's code, in millimetres, for the hint. */
	const codeMinimum = $derived(
		elements.flatMap(({ spec }) => (spec.shape === 'square' ? [spec.minSide] : [])).at(0)
	);
	/** Pixels per point, so texts show at the size they will print. */
	const scale = $derived(page ? frameWidth / page.width : 1);

	$effect(() => {
		const target = canvas;
		const width = frameWidth;
		const index = pageIndex;
		if (!target || !templateUrl || width === 0) return;
		rendering = true;
		renderTemplatePage({ url: templateUrl, canvas: target, cssWidth: width, page: index })
			.then((drawn) => {
				page = { width: drawn.width, height: drawn.height };
				pageCount = drawn.pageCount;
			})
			.catch((error) => {
				logger.error('Could not draw the template', error);
				toast.error(m.certificateLayoutTemplateError());
			})
			.finally(() => (rendering = false));
	});

	/** The element being dragged or resized, where the pointer started and its placement then. */
	let drag: {
		id: string;
		shape: 'text' | 'box' | 'square' | 'field';
		resize: boolean;
		x: number;
		y: number;
		start: Placement;
		/** A code's smallest size, as a fraction of the page's width. */
		minSize?: number;
		/** A field's smallest size, as fractions of the page. */
		minBox?: { width: number; height: number };
	} | null = null;

	// fallow-ignore-next-line complexity
	function begin({
		event,
		id,
		resize = false
	}: {
		event: PointerEvent;
		id: string;
		resize?: boolean;
	}) {
		const spec = elements.find((element) => element.id === id)?.spec;
		if (!spec) return;
		event.preventDefault();
		event.stopPropagation();
		frame?.setPointerCapture(event.pointerId);
		const start = $state.snapshot(placed[id]);
		const minSize =
			spec.shape === 'square' ? minSquareSize({ minSide: spec.minSide, pageWidth }) : undefined;
		const minBox =
			spec.shape === 'field'
				? fieldMinimum({
						mark: PAPER_FIELDS[spec.field].mark,
						page: page ?? { width: 595, height: 842 }
					})
				: undefined;
		drag = {
			id,
			shape: spec.shape,
			resize,
			x: event.clientX,
			y: event.clientY,
			start,
			minSize,
			minBox
		};
	}

	/** Moving and resizing, for the elements that can be resized. */
	function dragHandlers(id: string) {
		return {
			onmove: (event: PointerEvent) => begin({ event, id }),
			onresize: (event: PointerEvent) => begin({ event, id, resize: true })
		};
	}

	/** Where the dragged element lines up with another, drawn as guides while it is dragged. */
	let guides = $state<SnapGuides>({ vertical: [], horizontal: [] });

	/** How near an edge snaps (1.5 mm) and the grid it moves on otherwise (1 mm), as page fractions. */
	const snapSteps = $derived.by(() => {
		const size = page ?? { width: 595, height: 842 };
		const along = (millimetres: number) => ({
			x: (millimetres * POINTS_PER_MM) / size.width,
			y: (millimetres * POINTS_PER_MM) / size.height
		});
		return { threshold: along(1.5), grid: along(1) };
	});

	/**
	 * `next` lined up with the other elements on the page, or on the grid (`#lib/helpers/layoutSnap`);
	 * a code keeps the size it was dragged to.
	 */
	function snapped({ next, active }: { next: Placement; active: NonNullable<typeof drag> }) {
		const others = onPage
			.filter((element) => element.id !== active.id)
			.map((element) => placementRect({ ...element, aspect }));
		const { shape, resize } = active;
		if (resize && shape === 'square')
			return { placement: next, guides: { vertical: [], horizontal: [] } };
		const snap = snapRect({
			rect: placementRect({ shape, placement: next, aspect }),
			others,
			steps: snapSteps,
			resize
		});
		const shift = { shape, start: next, dx: snap.dx, dy: snap.dy, aspect };
		const placement = resize
			? resizePlacement({ ...shift, minBox: active.minBox })
			: movePlacement(shift);
		return { placement, guides: snap.guides };
	}

	// fallow-ignore-next-line complexity
	function follow(event: PointerEvent) {
		if (!drag || !frame) return;
		const rect = frame.getBoundingClientRect();
		const dx = (event.clientX - drag.x) / rect.width;
		const dy = (event.clientY - drag.y) / rect.height;
		const dragged = dragPlacement({
			shape: drag.shape,
			start: drag.start,
			resize: drag.resize,
			dx,
			dy,
			aspect,
			minSize: drag.minSize,
			minBox: drag.minBox
		});
		// Alt places freely
		const lined = event.altKey
			? { placement: dragged, guides: { vertical: [], horizontal: [] } }
			: snapped({ next: dragged, active: drag });
		const next = lined.placement;
		guides = lined.guides;
		// nothing goes over the page number or the marks: the element stops where it last fitted
		const { id, shape } = drag;
		const covers = coversFixedArea({
			document: kind,
			id,
			shape,
			placement: next,
			aspect,
			scanning: withFields
		});
		if (covers) return;
		layout[id] = next;
	}

	function end(event: PointerEvent) {
		if (frame?.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
		drag = null;
		guides = { vertical: [], horizontal: [] };
	}

	/** Puts a field on another page of the template, where it was on its own. */
	function moveToPage(id: string, target: number) {
		const placement = layout[id];
		if ('page' in placement) layout[id] = { ...placement, page: target };
	}

	function resizeFont(id: string, step: number) {
		const placement = layout[id];
		if ('size' in placement) layout[id] = resizeText({ start: placement, step });
	}

	let printing = $state(false);
	async function print() {
		printing = true;
		try {
			await testPrint($state.snapshot(placed));
		} catch (error) {
			logger.error('Test print failed', error);
		} finally {
			printing = false;
		}
	}

	async function save() {
		// Selecting the layouts puts the saved ones into the cache, where the test prints and the
		// next editor read them.
		const promise = Promise.resolve(
			client.mutate.setDocumentLayout({
				__args: { conferenceId, document: kind, layout: $state.snapshot(placed) },
				documentLayouts: true
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		open = false;
		onclose();
	}

	const label = (id: string) => (isLayoutElement(id) ? elementLabel[id]() : id);
	const sample = (id: string) =>
		id === 'sessions' ? certificateSessions : isLayoutElement(id) ? elementSample[id]() : [];

	// The elements by shape, each with its current placement in that shape.
	const byShape = $derived(elementsByShape({ elements: shown, layout: placed }));
	// The texts are written on the first page; a field shows on its own page.
	const texts = $derived(pageIndex === 0 ? byShape.texts : []);
	const boxes = $derived(byShape.boxes);
	const squares = $derived(byShape.squares);
	const allFields = $derived(byShape.fields);
	const fields = $derived(allFields.filter(({ placement }) => placement.page === pageIndex));
	/** Everything on the page shown, to line a dragged element up with. */
	const onPage = $derived([
		...texts.map(({ id, placement }) => ({ id, shape: 'text' as const, placement })),
		...boxes.map(({ id, placement }) => ({ id, shape: 'box' as const, placement })),
		...squares.map(({ id, placement }) => ({ id, shape: 'square' as const, placement })),
		...fields.map(({ id, placement }) => ({ id, shape: 'field' as const, placement }))
	]);
	/** The pages a field can go on: the template's, and one it was put on before a shorter template came. */
	const pageChoices = $derived(
		Array.from(
			{
				length: Math.max(pageCount, ...allFields.map(({ placement }) => placement.page + 1))
			},
			(_, index) => index
		)
	);
</script>

<Modal bind:open {title} fullWidth {onclose}>
	<div class="flex w-6xl max-w-full flex-col gap-4">
		<p class="text-base-content/70 text-sm">
			{withoutSessions ? m.certificateLayoutHintWithoutSessions() : m.certificateLayoutHint()}
		</p>
		{#if codeMinimum !== undefined}
			<p class="text-base-content/70 text-sm">
				{m.documentLayoutCodeMinimum({ size: codeMinimum })}
			</p>
		{/if}
		{#if allFields.length > 0}
			<p class="text-base-content/70 text-sm">{m.documentLayoutFieldsHint()}</p>
		{/if}
		<p class="text-base-content/70 text-sm">{m.documentLayoutSnapHint()}</p>
		{#if pageCount > 1}
			<LayoutPager bind:page={pageIndex} count={pageCount} />
		{/if}
		{#if withoutSessions}
			<div role="note" class="alert alert-info alert-soft text-sm">
				<i aria-hidden="true" class="ph-duotone ph-list-checks"></i>
				<span>{m.certificateLayoutNoSessions()}</span>
				<a
					class="btn btn-sm btn-ghost"
					href={resolve('/(authenticated)/dashboard/[conferenceId]/team/attendance', {
						conferenceId
					})}
				>
					{m.certificateLayoutNoSessionsLink()}
					<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				</a>
			</div>
		{/if}

		<!-- The page and the parts placed on it; positions are fractions of the page. -->
		<div
			bind:this={frame}
			bind:clientWidth={frameWidth}
			class="border-base-300 relative mx-auto w-full max-w-4xl touch-none select-none border bg-white"
			style="aspect-ratio: {aspect};"
			role="application"
			aria-label={title}
			onpointermove={follow}
			onpointerup={end}
			onpointercancel={end}
		>
			<canvas bind:this={canvas} class="absolute inset-0 h-full w-full"></canvas>
			<LayoutGuides {guides} />
			{#if rendering}
				<div class="absolute inset-0 flex items-center justify-center">
					<span class="loading loading-spinner loading-lg text-primary"></span>
				</div>
			{/if}

			{#each texts as { id, align, placement } (id)}
				<LayoutTextElement
					label={label(id)}
					{placement}
					{align}
					lines={sample(id)}
					{scale}
					onmove={(event) => begin({ event, id })}
				/>
			{/each}
			{#each boxes as { id, placement, list, fixed } (id)}
				<LayoutBoxElement
					label={label(id)}
					{placement}
					lines={sample(id)}
					{list}
					{scale}
					{...fixed ? {} : dragHandlers(id)}
				/>
			{/each}
			{#each fields as { id, placement, mark } (id)}
				<LayoutFieldElement label={label(id)} {placement} {mark} {scale} {...dragHandlers(id)} />
			{/each}
			{#each squares as { id, placement, caption } (id)}
				<LayoutSquareElement
					label={label(id)}
					{placement}
					captions={sample(id)}
					{caption}
					{scale}
					{...dragHandlers(id)}
				/>
			{/each}
		</div>

		{#if allFields.length > 0 && pageChoices.length > 1}
			<LayoutFieldPages
				fields={allFields.map(({ id, placement }) => ({
					id,
					label: label(id),
					page: placement.page
				}))}
				pages={pageChoices}
				onmove={moveToPage}
			/>
		{/if}

		{#if texts.length > 0}
			<LayoutFontSizes
				texts={texts.map(({ id, placement }) => ({ id, label: label(id), size: placement.size }))}
				onstep={resizeFont}
			/>
		{/if}
	</div>

	{#snippet action()}
		<button type="button" class="btn btn-ghost" onclick={() => (layout = defaultLayout(kind))}>
			<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
			{m.certificateLayoutReset()}
		</button>
		<button type="button" class="btn" disabled={printing || !templateUrl} onclick={print}>
			<i aria-hidden="true" class="ph-fill {printing ? 'ph-spinner-gap animate-spin' : 'ph-flask'}"
			></i>
			{m.postalTemplateTest()}
		</button>
		<button type="button" class="btn btn-primary" onclick={save}>
			<i aria-hidden="true" class="ph-fill ph-floppy-disk"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>
