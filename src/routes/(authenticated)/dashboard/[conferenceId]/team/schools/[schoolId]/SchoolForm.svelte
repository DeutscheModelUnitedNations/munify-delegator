<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client.js';
	import Form from '#lib/components/form/Form.svelte';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import AddressFields from '#lib/components/form/AddressFields.svelte';
	import { ADDRESS_FIELDS, addressRules } from '#lib/helpers/addressRules.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { m } from '#lib/paraglide/messages.js';
	import { schoolFormSchema, toUpdateSchoolArgs, type SchoolFormValues } from './schoolForm';

	/** The team's details of a school. Its parent keys it by the school, so it seeds once per school. */
	interface Props {
		schoolId: string;
	}

	let { schoolId }: Props = $props();

	// seeds the form once; re-reading it while someone types would discard their edits
	const stored = await client.query.school({
		__args: { id: untrack(() => schoolId) },
		name: true,
		street: true,
		apartment: true,
		zip: true,
		city: true,
		region: true,
		country: true,
		website: true,
		contactName: true,
		contactEmail: true,
		contactPhone: true,
		notes: true
	});

	// Field by field: the generated client hands back a subscribeable proxy.
	const initialValues: SchoolFormValues = {
		name: stored.name,
		street: stored.street ?? undefined,
		apartment: stored.apartment ?? undefined,
		zip: stored.zip ?? undefined,
		city: stored.city ?? undefined,
		region: stored.region ?? undefined,
		country: stored.country ?? undefined,
		website: stored.website ?? undefined,
		contactName: stored.contactName ?? undefined,
		contactEmail: stored.contactEmail ?? undefined,
		contactPhone: stored.contactPhone ?? undefined,
		notes: stored.notes ?? undefined
	};

	const form = superForm(defaults(initialValues, zod4Client(schoolFormSchema)), {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(schoolFormSchema),
		onError: (e) => toast.error(e.result.error.message),
		async onUpdate({ form: validated }) {
			if (!validated.valid) return;
			const promise = client.mutate.updateSchool({
				__args: toUpdateSchoolArgs(schoolId, validated.data),
				id: true,
				name: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		}
	});
	const formData = $derived(form.form);
	// which of postal code, city and region the picked country's addresses use
	const address = $derived(addressRules($formData.country));
</script>

<Form {form}>
	<FormSection title={m.school()} icon="school">
		<FormTextInput {form} name="name" label={m.name()} />
		<FormTextInput {form} name="website" type="url" label={m.website()} placeholder="https://" />
	</FormSection>
	<FormSection title={m.address()} icon="house">
		<AddressFields {form} fields={ADDRESS_FIELDS} rules={address} />
	</FormSection>
	<FormSection title={m.schoolContact()} icon="address-book" description={m.schoolContactHint()}>
		<FormTextInput {form} name="contactName" label={m.name()} />
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<FormTextInput {form} name="contactEmail" type="email" label={m.email()} />
			<FormTextInput {form} name="contactPhone" type="tel" label={m.phone()} />
		</div>
	</FormSection>
	<FormSection title={m.schoolNotes()} icon="note-sticky" description={m.schoolNotesHint()}>
		<FormTextArea {form} name="notes" label={m.schoolNotes()} />
	</FormSection>
</Form>
