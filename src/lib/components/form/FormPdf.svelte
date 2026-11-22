<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, File> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		fieldProxy,
		fileProxy
	} from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import { logger } from '#lib/logger';
	import { renderTemplatePage } from '#lib/helpers/pdfPages';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import { m } from '#lib/paraglide/messages';

	/**
	 * A PDF upload, as `FormImage` is one for pictures: a drop zone that takes a click or a dropped
	 * file and shows the first page of what was picked, small, in the page's own shape (a portrait
	 * A4 page until it is drawn; as wide as its container), falling back to the stored PDF, with how many pages it has. Fills a `File` field of the form. With `removable`, a stored
	 * PDF can be removed too, which sets the field to `null`.
	 */
	interface Props {
		name: N;
		/** Names the upload; shown unless `hideLabel` (a card with its own title). */
		label: string;
		hideLabel?: boolean;
		form: SuperForm<A, B>;
		/** The PDF as currently stored, shown until a new file is picked. */
		storedUrl?: string | null;
		/** Whether the stored PDF may be removed; the field's schema has to accept `null`. */
		removable?: boolean;
	}

	let {
		form,
		label,
		hideLabel = false,
		name,
		storedUrl = null,
		removable = false
	}: Props = $props();

	const file = $derived(fileProxy(form, name));
	const value = $derived(fieldProxy(form, name));
	const removed = $derived($value === null && !!storedUrl);
	let input: HTMLInputElement | undefined = $state();
	let dragging = $state(false);

	const picked = $derived($file?.[0]);
	// Derived so the object URL is released when the file changes or the field goes away.
	let pickedUrl = $state<string>();
	$effect(() => {
		if (!picked) {
			pickedUrl = undefined;
			return;
		}
		const url = URL.createObjectURL(picked);
		pickedUrl = url;
		return () => URL.revokeObjectURL(url);
	});
	const source = $derived(pickedUrl ?? (removed ? null : storedUrl));

	/** The first page, drawn small; how many pages there are once it is. */
	let canvas: HTMLCanvasElement | undefined = $state();
	let pageCount = $state<number>();
	/** The page's width over its height: portrait A4 until the first page is drawn. */
	let aspect = $state(210 / 297);
	let failed = $state(false);
	$effect(() => {
		const url = source;
		const target = canvas;
		pageCount = undefined;
		failed = false;
		if (!url || !target) return;
		renderTemplatePage({ url, canvas: target, cssWidth: 360 })
			.then((drawn) => {
				if (source !== url) return;
				pageCount = drawn.pageCount;
				aspect = drawn.width / drawn.height;
			})
			.catch((error) => {
				logger.warn('Could not draw the PDF preview', error);
				failed = true;
			});
	});

	function setFiles(files: FileList) {
		if (!input) return;
		input.files = files;
		// bind:files listens for change; assigning `files` does not fire it
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = event.dataTransfer?.files;
		if (files?.[0]?.type === 'application/pdf') setFiles(files);
	}

	/** Back to the stored PDF, from a picked file and from a removal alike. */
	function clearPicked() {
		setFiles(new DataTransfer().files);
	}

	function removeStored() {
		// Through the form itself: the proxies cannot know that this field's schema takes `null`
		form.form.update(($form) => ({ ...$form, [name]: null }), { taint: true });
	}
</script>

{#snippet preview()}
	<canvas
		bind:this={canvas}
		class="absolute inset-0 h-full w-full bg-white object-contain {failed ? 'hidden' : ''}"
		aria-hidden="true"
	></canvas>
	{#if failed}
		<div class="absolute inset-0 flex items-center justify-center">
			<i aria-hidden="true" class="ph-duotone ph-file-pdf text-base-content/50 text-5xl"></i>
		</div>
	{/if}
	<div class="absolute inset-x-1 bottom-1 flex flex-col items-start gap-0.5">
		{#if picked}
			<span class="badge badge-info badge-sm max-w-full truncate">{picked.name}</span>
		{/if}
		{#if pageCount}
			<span class="badge badge-neutral badge-sm">{m.pdfPageCount({ count: pageCount })}</span>
		{/if}
	</div>
{/snippet}

{#snippet corner()}
	{#if removable && storedUrl && !picked && !removed}
		<button
			type="button"
			class="btn btn-circle btn-xs btn-error absolute top-1.5 right-1.5"
			aria-label={m.templateRemove()}
			title={m.templateRemove()}
			onclick={removeStored}
		>
			<i aria-hidden="true" class="ph-duotone ph-trash"></i>
		</button>
	{:else if removed}
		<button
			type="button"
			class="btn btn-circle btn-xs btn-neutral absolute top-1.5 right-1.5"
			aria-label={m.templateUndoRemoval()}
			title={m.templateUndoRemoval()}
			onclick={clearPicked}
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
		</button>
	{/if}
	{#if picked}
		<button
			type="button"
			class="btn btn-circle btn-xs btn-neutral absolute top-1.5 right-1.5"
			aria-label={m.discardSelectedImage()}
			title={m.discardSelectedImage()}
			onclick={clearPicked}
		>
			<i aria-hidden="true" class="ph-duotone ph-x"></i>
		</button>
	{/if}
{/snippet}

<Field {form} {name}>
	<!-- the error line takes no room while there is none: a card lines its buttons up with the page -->
	<div class="flex w-full flex-col gap-1 [&_.validator-hint:not(:has(*))]:hidden">
		<Control>
			{#snippet children({ props })}
				<Label class={hideLabel ? 'sr-only' : 'label mb-1 whitespace-break-spaces'}>{label}</Label>
				<!-- shaped like the page: a portrait A4 one until the first page is drawn -->
				<div
					role="presentation"
					class="border-base-300 bg-base-200/50 hover:border-primary rounded-box relative w-full overflow-hidden border-2 border-dashed transition-colors {dragging
						? 'border-primary bg-primary/10'
						: ''} {source && !failed ? 'border-solid' : ''}"
					style="aspect-ratio: {aspect};"
					ondragover={(e) => {
						e.preventDefault();
						dragging = true;
					}}
					ondragleave={() => (dragging = false)}
					ondrop={onDrop}
				>
					{#if source}{@render preview()}{/if}
					<label
						class="flex cursor-pointer flex-col items-center justify-center gap-1 p-3 text-center text-xs {source
							? 'bg-base-100/85 absolute inset-0 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100'
							: 'h-full'}"
					>
						<i aria-hidden="true" class="ph-duotone ph-cloud-arrow-up text-primary text-2xl"></i>
						<span class="font-medium">{source ? m.replacePdf() : m.chooseOrDropPdf()}</span>
						<input
							{...props}
							bind:this={input}
							type="file"
							class="sr-only"
							accept="application/pdf"
							bind:files={$file}
						/>
					</label>
					{@render corner()}
				</div>
			{/snippet}
		</Control>
		<FormFieldErrors />
	</div>
</Field>
