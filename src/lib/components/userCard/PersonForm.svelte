<script lang="ts">
	import { untrack } from 'svelte';
	import { foodPreferenceOptions, genderOptions } from '#lib/components/form/userFieldOptions';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { adminUserFormSchema } from '#lib/schemata/userForm';
	import Form from '#lib/components/form/Form.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import FormSelect from '#lib/components/form/FormSelect.svelte';
	import FormDateTimeInput from '#lib/components/form/FormDateTimeInput.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import { translatedNationCodeAddressFormOptions } from '#lib/utils/nationTranslationHelper.svelte.js';
	import {
		buildUserFormValues,
		toUpdateUserArgs,
		type UserFormSource
	} from '#lib/api/userFormValues';
	import AddressRegionField from '#lib/components/form/AddressRegionField.svelte';
	import { addressRules } from '#lib/helpers/addressRules';
	import { toast } from 'svelte-sonner';

	/** Edits a person's details. The email address comes from the sign-in account and is not one. */
	interface Props {
		userId: string;
		/** The stored row, which the fields start from */
		user: UserFormSource;
		/** The edit is over, saved or not */
		ondone: () => void;
	}

	let { userId, user, ondone }: Props = $props();

	// Seeded once: following the live row would discard what is being typed
	const form = superForm(
		defaults(
			untrack(() => buildUserFormValues(user)),
			zod4Client(adminUserFormSchema)
		),
		{
			SPA: true,
			validators: zod4Client(adminUserFormSchema),
			resetForm: false,
			validationMethod: 'oninput',
			async onUpdate({ form: updatedForm }) {
				if (!updatedForm.valid) return;

				const promise = client.mutate.updateUser({
					__args: toUpdateUserArgs({ id: userId, values: updatedForm.data }),
					id: true
				});

				toast.promise(promise, {
					loading: m.genericToastLoading(),
					success: m.saved(),
					error: m.httpGenericError()
				});

				try {
					await promise;
					ondone();
				} catch {
					// Error already shown by toast.promise
				}
			}
		}
	);

	const { form: formData } = form;
	// which of postal code, city and region the picked country's addresses use
	const address = $derived(addressRules($formData.country));
</script>

<Form {form} requireTaintedToSubmit={true}>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="flex flex-col gap-6">
			<FormFieldset title={m.legalName()}>
				<FormTextInput {form} name="given_name" label={m.firstName()} placeholder={m.firstName()} />
				<FormTextInput {form} name="family_name" label={m.lastName()} placeholder={m.lastName()} />
			</FormFieldset>

			<FormFieldset title={m.personalInformation()}>
				<FormDateTimeInput
					{form}
					name="birthday"
					label={m.birthDate()}
					defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
					enableFutureDates={false}
				/>
				<FormSelect {form} name="gender" label={m.gender()} options={genderOptions()} />
				<FormTextInput
					{form}
					name="pronouns"
					label={m.pronouns()}
					placeholder={m.pronounsExample()}
				/>
				<FormSelect
					{form}
					name="foodPreference"
					label={m.diet()}
					options={foodPreferenceOptions()}
				/>
			</FormFieldset>
		</div>

		<div class="flex flex-col gap-6">
			<FormFieldset title={m.contactInformation()}>
				<FormTextInput {form} name="phone" label={m.phoneNumber()} placeholder="+49 123456789" />
				<FormTextInput {form} name="street" label={m.street()} placeholder={m.street()} />
				<FormTextInput
					{form}
					name="apartment"
					label={m.streetAddition()}
					placeholder={m.streetAddition()}
				/>
				<FormSelect
					{form}
					name="country"
					label={m.country()}
					placeholder={m.pleaseSelectCountry()}
					options={translatedNationCodeAddressFormOptions}
				/>
				{#if address.zip}
					<FormTextInput {form} name="zip" label={m.zipCode()} placeholder={m.zipCode()} />
				{/if}
				{#if address.city}
					<FormTextInput {form} name="city" label={m.city()} placeholder={m.city()} />
				{/if}
				<AddressRegionField {form} name="region" rules={address} />
				<FormTextArea
					{form}
					name="emergencyContacts"
					label={m.emergencyContacts()}
					placeholder={m.emergencyContactsPlaceholder()}
				/>
			</FormFieldset>
		</div>
	</div>
</Form>

<div class="flex justify-end">
	<button class="btn btn-sm btn-ghost text-primary" onclick={ondone}>
		<i aria-hidden="true" class="ph-duotone ph-x"></i>
		{m.cancel()}
	</button>
</div>
