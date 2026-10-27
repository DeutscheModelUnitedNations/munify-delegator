<script lang="ts">
	import { foodPreferenceOptions, genderOptions } from '#lib/components/form/userFieldOptions.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { adminUserFormSchema } from '../../../../routes/(authenticated)/my-account/form-schema';
	import Form from '#lib/components/form/Form.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import FormSelect from '#lib/components/form/FormSelect.svelte';
	import FormDateTimeInput from '#lib/components/form/FormDateTimeInput.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import { translatedNationCodeAddressFormOptions } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { buildUserFormValues, toUpdateUserArgs } from '#lib/api/userFormValues.js';
	import AddressRegionField from '#lib/components/form/AddressRegionField.svelte';
	import { addressRules } from '#lib/helpers/addressRules.js';
	import { toast } from 'svelte-sonner';
	import AccountSection from '../AccountSection.svelte';
	import ParticipantSchoolSection from '../ParticipantSchoolSection.svelte';
	import CopyField from '../CopyField.svelte';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { untrack } from 'svelte';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// Awaited once and not in a `$derived`: it seeds the form, and re-running it while someone edits
	// would discard their changes. The result is still live, so the read-only parts below and the
	// values a cancelled edit falls back to follow the stored row.
	const user = await client.liveQuery.user({
		__args: { id: untrack(() => userId) },
		id: true,
		givenName: true,
		familyName: true,
		pronouns: true,
		phone: true,
		email: true,
		street: true,
		apartment: true,
		zip: true,
		city: true,
		region: true,
		country: true,
		gender: true,
		birthday: true,
		foodPreference: true,
		emergencyContacts: true
	});

	let editing = $state(false);

	const initialData = defaults(buildUserFormValues(user), zod4Client(adminUserFormSchema));

	const form = superForm(initialData, {
		SPA: true,
		validators: zod4Client(adminUserFormSchema),
		resetForm: false,
		validationMethod: 'oninput',
		async onUpdate({ form: updatedForm }) {
			if (!updatedForm.valid) return;

			const promise = client.mutate.updateUser({
				__args: toUpdateUserArgs(userId, updatedForm.data),
				id: true
			});

			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: m.saved(),
				error: m.httpGenericError()
			});

			try {
				await promise;
				editing = false;
			} catch {
				// Error already shown by toast.promise
			}
		}
	});

	const { form: formData } = form;
	// which of postal code, city and region the picked country's addresses use
	const address = $derived(addressRules($formData.country));

	function toggleEdit() {
		if (editing) {
			$formData = buildUserFormValues(user);
			editing = false;
		} else {
			editing = true;
		}
	}

	// What the copy buttons copy: the stored values as the fields show them, labels for the selects
	const labelOf = (options: { value: string; label: string }[], value: string | null) =>
		options.find((option) => option.value === value)?.label;
	// A calendar day arrives as UTC midnight, so it is formatted in UTC
	const birthdayText = $derived(
		user.birthday?.toLocaleDateString(getLocale(), { dateStyle: 'medium', timeZone: 'UTC' })
	);
	const showCopy = $derived(!editing);

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text);
		toast.success(m.codeCopied());
	};

	const genderIcon = $derived.by(() => {
		switch (user.gender) {
			case 'MALE':
				return 'mars';
			case 'FEMALE':
				return 'venus';
			case 'DIVERSE':
				return 'transgender';
			default:
				return 'genderless';
		}
	});

	const foodIcon = $derived.by(() => {
		switch (user.foodPreference) {
			case 'OMNIVORE':
				return 'drumstick-bite';
			case 'VEGETARIAN':
				return 'carrot';
			case 'VEGAN':
				return 'leaf';
			default:
				return 'utensils';
		}
	});
</script>

<div class="flex flex-col gap-4">
	<Form {form} showSubmitButton={editing} requireTaintedToSubmit={true}>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Left column: Name & Personal Info -->
			<div class="flex flex-col gap-6">
				<FormFieldset title={m.legalName()}>
					<div class="mb-2 flex items-center gap-2 text-base-content/60">
						<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
					</div>
					<CopyField value={user.givenName} show={showCopy}>
						<FormTextInput
							{form}
							name="given_name"
							label={m.firstName()}
							placeholder={m.firstName()}
							disabled={!editing}
						/>
					</CopyField>
					<CopyField value={user.familyName} show={showCopy}>
						<FormTextInput
							{form}
							name="family_name"
							label={m.lastName()}
							placeholder={m.lastName()}
							disabled={!editing}
						/>
					</CopyField>
				</FormFieldset>

				<FormFieldset title={m.personalInformation()}>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-sharp-duotone fa-solid fa-birthday-cake"></i>
							<span class="text-sm">{m.birthDate()}</span>
						</div>
						<CopyField value={birthdayText} show={showCopy}>
							<FormDateTimeInput
								{form}
								name="birthday"
								defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
								enableFutureDates={false}
								disabled={!editing}
							/>
						</CopyField>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-sharp-duotone fa-solid fa-{genderIcon}"></i>
							<span class="text-sm">{m.gender()}</span>
						</div>
						<CopyField value={labelOf(genderOptions(), user.gender)} show={showCopy}>
							<FormSelect {form} name="gender" options={genderOptions()} disabled={!editing} />
						</CopyField>
					</div>
					<CopyField value={user.pronouns} show={showCopy}>
						<FormTextInput
							{form}
							name="pronouns"
							placeholder={m.pronounsExample()}
							label={m.pronouns()}
							disabled={!editing}
						/>
					</CopyField>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-sharp-duotone fa-solid fa-{foodIcon}"></i>
							<span class="text-sm">{m.diet()}</span>
						</div>
						<CopyField
							value={labelOf(foodPreferenceOptions(), user.foodPreference)}
							show={showCopy}
						>
							<FormSelect
								{form}
								name="foodPreference"
								options={foodPreferenceOptions()}
								disabled={!editing}
							/>
						</CopyField>
					</div>
				</FormFieldset>
			</div>

			<!-- Right column: Contact Info -->
			<div class="flex flex-col gap-6">
				<FormFieldset title={m.contactInformation()}>
					<!-- Email (read-only, from OIDC) with action buttons -->
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
							<span class="text-sm">{m.email()}</span>
						</div>
						<div class="flex items-center gap-1">
							<input
								id="email-readonly"
								class="input disabled:bg-base-300 w-full"
								value={user.email ?? 'N/A'}
								disabled
							/>
							{#if user.email}
								<div class="tooltip" data-tip={m.copy()}>
									<button
										type="button"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.copy()}
										onclick={() => copyToClipboard(user.email ?? '')}
									>
										<i class="fa-sharp-duotone fa-solid fa-copy"></i>
									</button>
								</div>
								<div class="tooltip" data-tip={m.email()}>
									<a
										href="mailto:{user.email}"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.email()}
									>
										<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
									</a>
								</div>
							{/if}
						</div>
					</div>

					<!-- Phone with action buttons -->
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-sharp-duotone fa-solid fa-phone"></i>
							<span class="text-sm">{m.phoneNumber()}</span>
						</div>
						<div class="flex items-center gap-1">
							<div class="w-full">
								<FormTextInput
									{form}
									name="phone"
									placeholder="+49 123456789"
									disabled={!editing}
								/>
							</div>
							{#if $formData.phone}
								<div class="tooltip" data-tip={m.copy()}>
									<button
										type="button"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.copy()}
										onclick={() => copyToClipboard(($formData.phone ?? '').toString())}
									>
										<i class="fa-sharp-duotone fa-solid fa-copy"></i>
									</button>
								</div>
								<div class="tooltip" data-tip={m.phoneNumber()}>
									<a
										href="tel:{$formData.phone}"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.phoneNumber()}
									>
										<i class="fa-sharp-duotone fa-solid fa-phone-arrow-up-right"></i>
									</a>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2 text-base-content/60 mt-2">
						<i class="fa-sharp-duotone fa-solid fa-house"></i>
						<span class="text-sm">{m.address()}</span>
					</div>
					<CopyField value={user.street} show={showCopy}>
						<FormTextInput {form} name="street" placeholder={m.street()} disabled={!editing} />
					</CopyField>
					<CopyField value={user.apartment} show={showCopy}>
						<FormTextInput
							{form}
							name="apartment"
							placeholder={m.streetAddition()}
							disabled={!editing}
						/>
					</CopyField>
					<CopyField
						value={labelOf(translatedNationCodeAddressFormOptions, user.country)}
						show={showCopy}
					>
						<FormSelect
							{form}
							name="country"
							placeholder={m.pleaseSelectCountry()}
							options={translatedNationCodeAddressFormOptions}
							disabled={!editing}
						/>
					</CopyField>
					{#if address.zip}
						<CopyField value={user.zip} show={showCopy}>
							<FormTextInput {form} name="zip" placeholder={m.zipCode()} disabled={!editing} />
						</CopyField>
					{/if}
					{#if address.city}
						<CopyField value={user.city} show={showCopy}>
							<FormTextInput {form} name="city" placeholder={m.city()} disabled={!editing} />
						</CopyField>
					{/if}
					<CopyField value={user.region} show={showCopy}>
						<AddressRegionField {form} name="region" rules={address} disabled={!editing} />
					</CopyField>

					<div class="flex items-center gap-2 text-base-content/60 mt-2">
						<i class="fa-sharp-duotone fa-solid fa-light-emergency-on"></i>
						<span class="text-sm">{m.emergencyContacts()}</span>
					</div>
					<CopyField value={user.emergencyContacts} show={showCopy}>
						<FormTextArea
							{form}
							name="emergencyContacts"
							placeholder={m.emergencyContactsPlaceholder()}
							disabled={!editing}
						/>
					</CopyField>
				</FormFieldset>
			</div>
		</div>
	</Form>

	<div class="flex justify-end">
		<button class="btn btn-sm {editing ? 'btn-ghost' : 'btn-outline'}" onclick={toggleEdit}>
			{#if editing}
				<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
				{m.cancel()}
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-pen-to-square"></i>
				{m.edit()}
			{/if}
		</button>
	</div>

	<ParticipantSchoolSection {userId} {conferenceId} />

	<!-- The opt-ins are masked for some readers, and a masked flag fails its whole query -->
	<svelte:boundary>
		<AccountSection {userId} />
		{#snippet failed()}{/snippet}
	</svelte:boundary>
</div>
