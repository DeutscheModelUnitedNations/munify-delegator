<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages.js';
	import Form from '#lib/components/form/Form.svelte';
	import EmailPreviewFrame from './EmailPreviewFrame.svelte';

	/** A form editing what the conference writes for its mails, with the mail previewed beside it. */
	interface Props {
		form: SuperForm<A, B>;
		preview: { subject: string; html: string } | undefined;
		children: Snippet;
		/** Buttons before the save button. */
		actions?: Snippet;
	}

	let { form, preview, children, actions }: Props = $props();
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<Form {form} showSubmitButton={false}>
		{@render children()}
		<div class="mt-4 flex flex-wrap justify-end gap-2">
			{@render actions?.()}
			<button type="submit" class="btn btn-primary">
				<i class="fas fa-save"></i>
				{m.save()}
			</button>
		</div>
	</Form>

	<EmailPreviewFrame {preview} />
</div>
