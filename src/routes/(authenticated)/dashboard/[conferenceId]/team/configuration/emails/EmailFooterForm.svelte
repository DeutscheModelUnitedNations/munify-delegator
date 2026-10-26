<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Locale } from '#lib/paraglide/runtime.js';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import EmailEditorLayout from './EmailEditorLayout.svelte';
	import { debounced, fetchEmailPreview } from './emailPreview.svelte';

	/**
	 * The footer under every mail in one language, with a mail previewed in it. Seeded once: the
	 * parent remounts it (`{#key}`) for another language.
	 */
	interface Props {
		conferenceId: string;
		locale: Locale;
	}

	let { conferenceId, locale }: Props = $props();

	const stored = await client.query.conferenceEmailFooters({
		__args: {
			where: untrack(() => ({ conferenceId: { eq: conferenceId }, locale: { eq: locale } }))
		},
		text: true
	});

	const schema = z.object({ text: z.string() });
	const adapter = zod4Client(schema);
	const form = superForm(defaults({ text: stored.at(0)?.text ?? '' }, adapter), {
		SPA: true,
		validators: adapter,
		validationMethod: 'oninput',
		resetForm: false,
		onUpdate: async ({ form: validated }) => {
			if (!validated.valid) return;
			const promise = Promise.resolve(
				client.mutate.setConferenceEmailFooter({
					__args: { conferenceId, locale, text: validated.data.text }
				})
			);
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		},
		onError: (e) => toast.error(e.result.error.message)
	});
	const formData = $derived(form.form);

	const draft = debounced(
		() => $formData.text,
		untrack(() => $formData.text)
	);
	const preview = $derived(
		await fetchEmailPreview({
			conferenceId,
			kind: 'ASSIGNMENT_ACCEPTED',
			locale,
			footer: draft.current
		})
	);
</script>

<EmailEditorLayout {form} {preview}>
	<FormTextArea
		{form}
		name="text"
		rows={8}
		label={m.emailFooterLabel()}
		description={m.emailFooterHint({ conference: '{conference}' })}
	/>
</EmailEditorLayout>
