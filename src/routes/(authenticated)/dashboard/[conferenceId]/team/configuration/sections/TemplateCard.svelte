<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, File> & FormPath<A>"
>
	import {
		fieldProxy,
		fileProxy,
		type FormPath,
		type FormPathLeaves,
		type SuperForm
	} from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages';
	import FormPdf from '#lib/components/form/FormPdf.svelte';
	import TemplateState from './TemplateState.svelte';

	/**
	 * One PDF template of the conference, everything about it in one place: whether one is stored,
	 * the upload with a preview of its first page (a field of the settings form, so it saves with
	 * the rest; removing it too), the stored file to open, placing the generated parts on it, and a
	 * test print where the document is printed on its own (the certificate; the postal documents
	 * print together, below their cards).
	 */
	interface Props {
		form: SuperForm<A, B>;
		/** The form field the new file goes into. */
		name: N;
		title: string;
		/** A Phosphor icon name, without the `ph-` prefix. */
		icon: string;
		/** The template the server holds; null until one is saved. */
		stored: { url: string } | null;
		/** Opens the layout editor; left out for a template nothing is drawn on. */
		onplace?: () => void;
		/** Prints a sample from the stored template; left out where the documents print together. */
		ontest?: () => void;
		/** A test print is running somewhere on the page. */
		printing?: boolean;
	}

	let { form, name, title, icon, stored, onplace, ontest, printing = false }: Props = $props();

	const file = $derived(fileProxy(form, name));
	const value = $derived(fieldProxy(form, name));
	/** A file is picked but not saved: placing and printing still work on the stored one. */
	const pending = $derived(($file?.length ?? 0) > 0);
	/** The stored template goes on the next save (the field is `null`). */
	const removed = $derived($value === null && !!stored);

	const state = $derived(
		removed ? 'removed' : pending ? 'pending' : stored ? 'stored' : ('missing' as const)
	);

	/** Why placing and printing are off, if they are. */
	const blocked = $derived(
		!stored ? m.templateNeedsSaving() : pending || removed ? m.templatePendingBlocks() : undefined
	);
</script>

{#snippet placeButton(place: () => void)}
	<span class={blocked ? 'tooltip' : ''} data-tip={blocked}>
		<button
			type="button"
			class="btn btn-sm btn-primary btn-soft"
			disabled={!!blocked}
			onclick={place}
		>
			<i aria-hidden="true" class="ph-duotone ph-arrows-out-cardinal"></i>
			{m.templatePlace()}
		</button>
	</span>
{/snippet}

{#snippet testButton(test: () => void)}
	<span class={blocked ? 'tooltip' : ''} data-tip={blocked}>
		<button
			type="button"
			class="btn btn-sm btn-ghost"
			disabled={!!blocked || printing}
			onclick={test}
		>
			<i
				aria-hidden="true"
				class="ph-duotone {printing ? 'ph-spinner-gap animate-spin' : 'ph-flask'}"
			></i>
			{m.templateTest()}
		</button>
	</span>
{/snippet}

<!-- the page on the left, as a portrait A4 tile; what it is and what to do with it beside it -->
<div
	class="bg-base-100 rounded-box border-base-300 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 border p-4"
>
	<FormPdf {form} {name} label={title} hideLabel storedUrl={stored?.url ?? null} removable />

	<div class="flex min-w-0 flex-col gap-3">
		<div class="flex items-start gap-2">
			<i aria-hidden="true" class="ph-duotone ph-{icon} text-primary mt-0.5 shrink-0 text-lg"></i>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<span class="leading-tight font-semibold">{title}</span>
				<TemplateState {state} />
			</div>
			{#if stored && !removed}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- a file in the bucket -->
				<a
					class="btn btn-ghost btn-sm btn-square shrink-0"
					href={stored.url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={m.templateView()}
					title={m.templateView()}
				>
					<i aria-hidden="true" class="ph-duotone ph-eye"></i>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>

		<div class="mt-auto flex flex-wrap gap-2">
			{#if onplace}{@render placeButton(onplace)}{/if}
			{#if ontest}{@render testButton(ontest)}{/if}
		</div>
	</div>
</div>
