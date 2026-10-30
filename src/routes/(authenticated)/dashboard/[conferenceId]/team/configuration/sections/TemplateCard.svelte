<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, File> & FormPath<A>"
>
	import {
		fileProxy,
		type FormPath,
		type FormPathLeaves,
		type SuperForm
	} from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages';
	import FormFile from '#lib/components/form/FormFile.svelte';

	/**
	 * One PDF template of the conference, everything about it in one place: whether one is stored,
	 * the upload (a field of the settings form, so it saves with the rest), a look at the stored
	 * file, placing the generated parts on it, and a test print.
	 */
	interface Props {
		form: SuperForm<A, B>;
		/** The form field the new file goes into. */
		name: N;
		title: string;
		/** A FontAwesome icon name, without the `fa-` prefix. */
		icon: string;
		/** The template the server holds; null until one is saved. */
		stored: { url: string } | null;
		/** Opens the layout editor; left out for a template nothing is drawn on. */
		onplace?: () => void;
		/** Prints a sample from the stored templates. */
		ontest: () => void;
		/** A test print is running somewhere on the page. */
		printing: boolean;
		/** Why the test print cannot run yet, beyond this template itself (another one missing). */
		testBlocked?: string;
	}

	let { form, name, title, icon, stored, onplace, ontest, printing, testBlocked }: Props = $props();

	const file = $derived(fileProxy(form, name));
	/** A file is picked but not saved: placing and printing still work on the stored one. */
	const pending = $derived(($file?.length ?? 0) > 0);

	/** Why placing and printing are off, if they are. */
	const blocked = $derived(
		!stored ? m.templateNeedsSaving() : pending ? m.templatePendingBlocks() : undefined
	);
	const testReason = $derived(blocked ?? testBlocked);
</script>

<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-3 border p-4">
	<div class="flex items-start gap-3">
		<div
			class="bg-primary/10 text-primary rounded-box flex h-10 w-10 shrink-0 items-center justify-center"
		>
			<i class="fa-sharp-duotone fa-solid fa-{icon} text-lg"></i>
		</div>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="font-semibold leading-tight">{title}</span>
			{#if pending}
				<span class="badge badge-info badge-soft badge-sm">
					<i class="fa-sharp-duotone fa-solid fa-cloud-arrow-up"></i>{m.templatePending()}
				</span>
			{:else if stored}
				<span class="badge badge-success badge-soft badge-sm">
					<i class="fa-sharp-duotone fa-solid fa-circle-check"></i>{m.templateStored()}
				</span>
			{:else}
				<span class="badge badge-warning badge-soft badge-sm">
					<i class="fa-sharp-duotone fa-solid fa-circle-exclamation"></i>{m.templateMissing()}
				</span>
			{/if}
		</div>
		{#if stored}
			<a
				class="btn btn-ghost btn-sm btn-square"
				href={stored.url}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={m.templateView()}
				title={m.templateView()}
			>
				<i class="fa-sharp-duotone fa-solid fa-eye"></i>
			</a>
		{/if}
	</div>

	<FormFile
		{form}
		{name}
		label={stored ? m.templateReplace() : m.templateUpload()}
		accept="application/pdf"
		inputClass="file-input-sm"
	/>

	<div class="flex flex-wrap gap-2">
		{#if onplace}
			<span class={blocked ? 'tooltip' : ''} data-tip={blocked}>
				<button type="button" class="btn btn-sm btn-outline" disabled={!!blocked} onclick={onplace}>
					<i class="fa-sharp-duotone fa-solid fa-arrows-up-down-left-right"></i>
					{m.templatePlace()}
				</button>
			</span>
		{/if}
		<span class={testReason ? 'tooltip' : ''} data-tip={testReason}>
			<button
				type="button"
				class="btn btn-sm btn-outline"
				disabled={!!testReason || printing}
				onclick={ontest}
			>
				<i class="fa-sharp-duotone fa-solid {printing ? 'fa-spinner fa-spin' : 'fa-flask-vial'}"
				></i>
				{m.templateTest()}
			</button>
		</span>
	</div>
</div>
