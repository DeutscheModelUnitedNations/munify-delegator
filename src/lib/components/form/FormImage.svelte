<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, File> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		fileProxy
	} from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import FormDescription from './FormDescription.svelte';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import { m } from '$lib/paraglide/messages';

	/**
	 * An image upload: a drop zone that takes a click or a dropped file and previews what was picked,
	 * falling back to the stored image. Fills the same form field `FormFile` does.
	 */
	interface Props {
		name: N;
		label: string;
		description?: string;
		form: SuperForm<A, B>;
		accept?: string;
		/** The image as currently stored, shown until a new file is picked. */
		storedUrl?: string | null;
	}

	let { form, label, description, name, accept = 'image/*', storedUrl = null }: Props = $props();

	const file = $derived(fileProxy(form, name));
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
	const src = $derived(pickedUrl ?? storedUrl);

	function setFiles(files: FileList) {
		if (!input) return;
		input.files = files;
		// bind:files listens for change; assigning `files` does not fire it
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	/** The dropped files, when the first one is an image. */
	function droppedImages(transfer: DataTransfer | null) {
		const first = transfer?.files[0];
		return first?.type.startsWith('image/') ? transfer?.files : undefined;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = droppedImages(event.dataTransfer);
		if (files) setFiles(files);
	}

	function clearPicked() {
		setFiles(new DataTransfer().files);
	}
</script>

<Field {form} {name}>
	<div class="flex w-full flex-col gap-1">
		<Control>
			{#snippet children({ props })}
				<Label class="label mb-1 whitespace-break-spaces">{label}</Label>
				<FormDescription {description} />
				<div
					role="presentation"
					class="border-base-300 bg-base-200/50 hover:border-primary relative flex min-h-36 items-center justify-center overflow-hidden rounded-box border-2 border-dashed transition-colors {dragging
						? 'border-primary bg-primary/10'
						: ''}"
					ondragover={(e) => {
						e.preventDefault();
						dragging = true;
					}}
					ondragleave={() => (dragging = false)}
					ondrop={onDrop}
				>
					{#if src}
						<img {src} alt={label} class="max-h-48 w-full object-contain p-2" />
					{/if}
					<label
						class="flex cursor-pointer flex-col items-center gap-1 p-6 text-center text-sm {src
							? 'bg-base-100/80 absolute inset-0 justify-center opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100'
							: ''}"
					>
						<i class="fa-duotone fa-cloud-arrow-up text-primary text-2xl"></i>
						<span class="font-medium">{src ? m.replaceImage() : m.chooseOrDropImage()}</span>
						<input
							{...props}
							bind:this={input}
							type="file"
							class="sr-only"
							{accept}
							bind:files={$file}
						/>
					</label>
					{#if picked}
						<button
							type="button"
							class="btn btn-circle btn-xs btn-neutral absolute top-2 right-2"
							aria-label={m.discardSelectedImage()}
							onclick={clearPicked}
						>
							<i class="fa-solid fa-xmark"></i>
						</button>
					{/if}
				</div>
			{/snippet}
		</Control>
		<FormFieldErrors />
	</div>
</Field>
