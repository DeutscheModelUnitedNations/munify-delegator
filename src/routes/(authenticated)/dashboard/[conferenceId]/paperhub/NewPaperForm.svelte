<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	import Form from '$lib/components/form/Form.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { m } from '$lib/paraglide/messages';

	/**
	 * The page an author writes a new paper on: its details beside the editor, with save and submit
	 * underneath them.
	 */
	interface Props {
		title: string;
		form: SuperForm<A, B>;
		/** The detail fields, inside the "Paper details" fieldset. */
		details: Snippet;
		editor: Snippet;
		onSave: (submit: boolean) => void;
	}

	let { title, form, details, editor, onSave }: Props = $props();
</script>

<div class="flex flex-col gap-2 w-full">
	<h2 class="text-2xl font-bold">{title}</h2>

	<Form {form} class="w-full flex flex-col xl:flex-row-reverse gap-4" showSubmitButton={false}>
		<div class="flex flex-col gap-4 xl:w-1/3">
			<FormFieldset title={m.paperDetails()}>
				{@render details()}
			</FormFieldset>

			<div class="join join-vertical w-full">
				<button class="btn btn-primary btn-outline btn-lg join-item" onclick={() => onSave(false)}>
					<i class="fa-solid fa-pencil mr-2"></i>
					{m.paperSaveDraft()}
				</button>
				<button class="btn btn-primary btn-lg join-item" onclick={() => onSave(true)}>
					<i class="fa-solid fa-paper-plane mr-2"></i>
					{m.paperSubmit()}
				</button>
			</div>
		</div>
		{@render editor()}
	</Form>
</div>
