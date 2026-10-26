<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import Modal from '#lib/components/Modal.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import {
		defaultLayout,
		dragPlacement,
		elementsOf,
		resizeText,
		resolveDocumentLayout,
		type BoxPlacement,
		type LayoutDocument,
		type SquarePlacement,
		type TextPlacement
	} from '#lib/helpers/documentLayout.js';
	import { elementLabel, elementSample, templateField, type LayoutElement } from './layoutElements';
	import { renderFirstPage } from './templatePage';
	import LayoutBoxElement from './LayoutBoxElement.svelte';
	import LayoutFontSizes from './LayoutFontSizes.svelte';
	import LayoutSquareElement from './LayoutSquareElement.svelte';
	import LayoutTextElement from './LayoutTextElement.svelte';

	type Placement = TextPlacement | BoxPlacement | SquarePlacement;
	type Layout = Record<string, Placement>;

	/**
	 * Places a document's generated parts on the conference's own template: its first page is drawn,
	 * and every part is a box on it to drag - boxes and codes also resize from their bottom right
	 * corner, texts change size below. The same editor serves the certificate and the postal
	 * documents; what each has comes from `DOCUMENT_ELEMENTS`.
	 */
	interface Props {
		conferenceId: string;
		document: LayoutDocument;
		title: string;
		/** Prints a sample of the document as laid out here, before it is saved. */
		testPrint: (layout: Layout) => Promise<void>;
		onclose: () => void;
	}

	let { conferenceId, document, title, testPrint, onclose }: Props = $props();

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
	const elements = elementsOf(kind);
	const isLayoutElement = (id: string): id is LayoutElement => Object.hasOwn(elementLabel, id);

	let layout = $state<Layout>(resolveDocumentLayout(kind, stored.documentLayouts));
	let open = $state(true);
	let canvas = $state<HTMLCanvasElement>();
	let frame = $state<HTMLDivElement>();
	let frameWidth = $state(0);
	/** The template page's size in points, known once it is drawn. */
	let page = $state<{ width: number; height: number }>();
	let rendering = $state(false);

	const aspect = $derived(page ? page.width / page.height : 595 / 842);
	/** Pixels per point, so texts show at the size they will print. */
	const scale = $derived(page ? frameWidth / page.width : 1);

	$effect(() => {
		const target = canvas;
		const width = frameWidth;
		if (!target || !templateUrl || width === 0) return;
		rendering = true;
		renderFirstPage(templateUrl, target, width)
			.then((size) => (page = size))
			.catch((error) => {
				console.error('Could not draw the template:', error);
				toast.error(m.certificateLayoutTemplateError());
			})
			.finally(() => (rendering = false));
	});

	/** The element being dragged or resized, where the pointer started and its placement then. */
	let drag: {
		id: string;
		shape: 'text' | 'box' | 'square';
		resize: boolean;
		x: number;
		y: number;
		start: Placement;
	} | null = null;

	function begin(event: PointerEvent, id: string, resize = false) {
		const shape = elements.find((element) => element.id === id)?.spec.shape;
		if (!shape) return;
		event.preventDefault();
		event.stopPropagation();
		frame?.setPointerCapture(event.pointerId);
		const start = $state.snapshot(layout[id]);
		drag = { id, shape, resize, x: event.clientX, y: event.clientY, start };
	}

	function follow(event: PointerEvent) {
		if (!drag || !frame) return;
		const rect = frame.getBoundingClientRect();
		const dx = (event.clientX - drag.x) / rect.width;
		const dy = (event.clientY - drag.y) / rect.height;
		layout[drag.id] = dragPlacement(drag.shape, drag.start, drag.resize, dx, dy, aspect);
	}

	function end(event: PointerEvent) {
		if (frame?.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
		drag = null;
	}

	function resizeFont(id: string, step: number) {
		const placement = layout[id];
		if ('size' in placement) layout[id] = resizeText(placement, step);
	}

	let printing = $state(false);
	async function print() {
		printing = true;
		try {
			await testPrint($state.snapshot(layout));
		} catch (error) {
			console.error('Test print failed:', error);
		} finally {
			printing = false;
		}
	}

	async function save() {
		// Selecting the layouts puts the saved ones into the cache, where the test prints and the
		// next editor read them.
		const promise = Promise.resolve(
			client.mutate.setDocumentLayout({
				__args: { conferenceId, document: kind, layout: $state.snapshot(layout) },
				documentLayouts: true
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		open = false;
		onclose();
	}

	const label = (id: string) => (isLayoutElement(id) ? elementLabel[id]() : id);
	const sample = (id: string) => (isLayoutElement(id) ? elementSample[id]() : []);

	// The elements by shape, each with its current placement in that shape.
	const texts = $derived(
		elements.flatMap(({ id, spec }) => {
			const placement = layout[id];
			return spec.shape === 'text' && !('width' in placement)
				? [{ id, align: spec.align, placement }]
				: [];
		})
	);
	const boxes = $derived(
		elements.flatMap(({ id, spec }) => {
			const placement = layout[id];
			return spec.shape === 'box' && 'width' in placement ? [{ id, placement }] : [];
		})
	);
	const squares = $derived(
		elements.flatMap(({ id, spec }) => {
			const placement = layout[id];
			return spec.shape === 'square' && !('width' in placement) ? [{ id, placement }] : [];
		})
	);
</script>

<Modal bind:open {title} fullWidth {onclose}>
	<div class="flex w-6xl max-w-full flex-col gap-4">
		<p class="text-base-content/70 text-sm">{m.certificateLayoutHint()}</p>

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
					onmove={(event) => begin(event, id)}
				/>
			{/each}
			{#each boxes as { id, placement } (id)}
				<LayoutBoxElement
					label={label(id)}
					{placement}
					lines={sample(id)}
					{scale}
					onmove={(event) => begin(event, id)}
					onresize={(event) => begin(event, id, true)}
				/>
			{/each}
			{#each squares as { id, placement } (id)}
				<LayoutSquareElement
					label={label(id)}
					{placement}
					captions={sample(id)}
					{scale}
					onmove={(event) => begin(event, id)}
					onresize={(event) => begin(event, id, true)}
				/>
			{/each}
		</div>

		{#if texts.length > 0}
			<LayoutFontSizes
				texts={texts.map(({ id, placement }) => ({ id, label: label(id), size: placement.size }))}
				onstep={resizeFont}
			/>
		{/if}
	</div>

	{#snippet action()}
		<button type="button" class="btn btn-ghost" onclick={() => (layout = defaultLayout(kind))}>
			<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
			{m.certificateLayoutReset()}
		</button>
		<button type="button" class="btn" disabled={printing || !templateUrl} onclick={print}>
			<i class="fas {printing ? 'fa-spinner fa-spin' : 'fa-vial'}"></i>
			{m.postalTemplateTest()}
		</button>
		<button type="button" class="btn btn-primary" onclick={save}>
			<i class="fas fa-save"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>
