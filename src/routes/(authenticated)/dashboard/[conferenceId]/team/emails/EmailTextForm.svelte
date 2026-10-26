<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';
	import { client } from '#lib/api/rumbleClient/client.js';
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Locale } from '#lib/paraglide/runtime.js';
	import Form from '#lib/components/form/Form.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import {
		defaultEmailText,
		placeholdersOf,
		type EmailPlaceholder,
		type EmailText
	} from '#lib/helpers/emailTemplates.js';

	/**
	 * One kind's text in one language, with a preview of the mail as it would go out. Seeded once:
	 * the parent remounts it (`{#key}`) for another language.
	 */
	interface Props {
		conferenceId: string;
		kind: EmailkindEnum;
		locale: Locale;
	}

	let { conferenceId, kind, locale }: Props = $props();

	const fallback: EmailText = untrack(() => defaultEmailText(kind, locale));

	const stored = await client.query.conferenceEmailTexts({
		__args: {
			where: untrack(() => ({
				conferenceId: { eq: conferenceId },
				kind: { eq: kind },
				locale: { eq: locale }
			}))
		},
		subject: true,
		heading: true,
		body: true
	});
	const own = stored.at(0);

	const schema = z.object({
		subject: z.string().trim().min(1),
		heading: z.string().trim().min(1),
		body: z.string().trim().min(1)
	});
	const initial: EmailText = {
		subject: own?.subject ?? fallback.subject,
		heading: own?.heading ?? fallback.heading,
		body: own?.body ?? fallback.body
	};

	/** A field equal to the default is stored as none, so it follows when the default improves. */
	const ownOrNone = (value: string, standard: string) =>
		value.trim() === standard.trim() ? null : value;

	async function save({ subject, heading, body }: EmailText) {
		const promise = Promise.resolve(
			client.mutate.setConferenceEmailText({
				__args: {
					conferenceId,
					kind,
					locale,
					subject: ownOrNone(subject, fallback.subject),
					heading: ownOrNone(heading, fallback.heading),
					body: ownOrNone(body, fallback.body)
				}
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	const adapter = zod4Client(schema);
	const form = superForm(defaults(initial, adapter), {
		SPA: true,
		validators: adapter,
		validationMethod: 'oninput',
		resetForm: false,
		onUpdate: ({ form: validated }) => (validated.valid ? save(validated.data) : undefined),
		onError: (e) => toast.error(e.result.error.message)
	});
	const formData = $derived(form.form);

	function restoreDefault() {
		form.form.set({ ...fallback }, { taint: true });
	}

	// The preview follows the text once typing pauses, not on every key.
	let draft = $state<EmailText>({ ...initial });
	$effect(() => {
		const next = { subject: $formData.subject, heading: $formData.heading, body: $formData.body };
		const timer = setTimeout(() => (draft = next), 400);
		return () => clearTimeout(timer);
	});
	const preview = $derived(
		await Promise.resolve(
			client.query.emailPreview({
				__args: { conferenceId, kind, locale, draft: true, ...draft },
				subject: true,
				html: true
			})
		).catch(() => undefined)
	);

	const placeholderHint: Record<EmailPlaceholder, () => string> = {
		name: m.emailPlaceholderName,
		conference: m.emailPlaceholderConference,
		seat: m.emailPlaceholderSeat,
		date: m.emailPlaceholderDate,
		student: m.emailPlaceholderStudent,
		item: m.emailPlaceholderItem,
		list: m.emailPlaceholderList,
		delegationHint: m.emailPlaceholderDelegationHint
	};
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<Form {form} showSubmitButton={false}>
		<FormTextInput {form} name="subject" label={m.emailTextSubject()} />
		<FormTextInput {form} name="heading" label={m.emailTextHeading()} />
		<FormTextArea
			{form}
			name="body"
			rows={12}
			label={m.emailTextBody()}
			description={m.emailTextBodyHint()}
		/>

		<div class="flex flex-col gap-1 text-sm">
			<span class="text-base-content/60 font-semibold">{m.emailTextPlaceholders()}</span>
			<ul class="flex flex-col gap-1">
				{#each placeholdersOf(kind) as placeholder (placeholder)}
					<li>
						<code class="bg-base-200 px-1">{`{${placeholder}}`}</code>
						<span class="text-base-content/70">{placeholderHint[placeholder]()}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="mt-4 flex flex-wrap justify-end gap-2">
			<button type="button" class="btn btn-ghost" onclick={restoreDefault}>
				<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
				{m.emailTextRestoreDefault()}
			</button>
			<button type="submit" class="btn btn-primary">
				<i class="fas fa-save"></i>
				{m.save()}
			</button>
		</div>
	</Form>

	<div class="flex min-w-0 flex-col gap-2">
		<p class="text-base-content/60 text-sm">{m.emailSettingsPreviewHint()}</p>
		{#if preview}
			<p class="font-semibold">{preview.subject}</p>
			<iframe
				title={preview.subject}
				srcdoc={preview.html}
				sandbox=""
				class="border-base-300 rounded-box h-160 max-h-screen w-full border bg-white"
			></iframe>
		{/if}
	</div>
</div>
