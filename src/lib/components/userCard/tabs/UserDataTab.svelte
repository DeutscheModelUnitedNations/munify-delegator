<script lang="ts">
	import { foodPreferenceOptions, genderOptions } from '$lib/components/form/userFieldOptions';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from '../../../../routes/(authenticated)/my-account/form-schema';
	import Form from '$lib/components/form/Form.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormDateTimeInput from '$lib/components/form/FormDateTimeInput.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { translatedNationCodeAddressFormOptions } from '$lib/utils/nationTranslationHelper.svelte';
	import { buildUserFormValues } from '$lib/api/userFormValues';
	import { toast } from 'svelte-sonner';
	import GlobalNotes from '../GlobalNotes.svelte';
	import { untrack } from 'svelte';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

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
		country: true,
		gender: true,
		birthday: true,
		foodPreference: true,
		emergencyContacts: true,
		globalNotes: true
	});

	let editing = $state(false);
	let globalNotesOpen = $state(false);

	// Admin form schema - omit newsletter preferences (personal user choice)
	const adminFormSchema = userFormSchema.omit({
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true
	});

	const initialData = defaults(buildUserFormValues(user), zod4Client(adminFormSchema));

	const form = superForm(initialData, {
		SPA: true,
		validators: zod4Client(adminFormSchema),
		resetForm: false,
		validationMethod: 'oninput',
		async onUpdate({ form: updatedForm }) {
			if (!updatedForm.valid) return;

			const { given_name, family_name, ...formData } = updatedForm.data;
			const promise = client.mutate.updateUser({
				__args: {
					...formData,
					id: userId,
					givenName: given_name,
					familyName: family_name
				},
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

	function toggleEdit() {
		if (editing) {
			$formData = buildUserFormValues(user);
			editing = false;
		} else {
			editing = true;
		}
	}

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
						<i class="fa-duotone fa-id-card"></i>
					</div>
					<FormTextInput
						{form}
						name="given_name"
						label={m.firstName()}
						placeholder={m.firstName()}
						disabled={!editing}
					/>
					<FormTextInput
						{form}
						name="family_name"
						label={m.lastName()}
						placeholder={m.lastName()}
						disabled={!editing}
					/>
				</FormFieldset>

				<FormFieldset title={m.personalInformation()}>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-duotone fa-birthday-cake"></i>
							<span class="text-sm">{m.birthDate()}</span>
						</div>
						<FormDateTimeInput
							{form}
							name="birthday"
							defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
							enableFutureDates={false}
							disabled={!editing}
						/>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-duotone fa-{genderIcon}"></i>
							<span class="text-sm">{m.gender()}</span>
						</div>
						<FormSelect {form} name="gender" options={genderOptions()} disabled={!editing} />
					</div>
					<FormTextInput
						{form}
						name="pronouns"
						placeholder={m.pronounsExample()}
						label={m.pronouns()}
						disabled={!editing}
					/>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-duotone fa-{foodIcon}"></i>
							<span class="text-sm">{m.diet()}</span>
						</div>
						<FormSelect
							{form}
							name="foodPreference"
							options={foodPreferenceOptions()}
							disabled={!editing}
						/>
					</div>
				</FormFieldset>
			</div>

			<!-- Right column: Contact Info -->
			<div class="flex flex-col gap-6">
				<FormFieldset title={m.contactInformation()}>
					<!-- Email (read-only, from OIDC) with action buttons -->
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-duotone fa-envelope"></i>
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
										<i class="fa-duotone fa-copy"></i>
									</button>
								</div>
								<div class="tooltip" data-tip={m.email()}>
									<a
										href="mailto:{user.email}"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.email()}
									>
										<i class="fa-duotone fa-paper-plane"></i>
									</a>
								</div>
							{/if}
						</div>
					</div>

					<!-- Phone with action buttons -->
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 text-base-content/60">
							<i class="fa-duotone fa-phone"></i>
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
										<i class="fa-duotone fa-copy"></i>
									</button>
								</div>
								<div class="tooltip" data-tip={m.phoneNumber()}>
									<a
										href="tel:{$formData.phone}"
										class="btn btn-ghost btn-sm btn-square"
										aria-label={m.phoneNumber()}
									>
										<i class="fa-duotone fa-phone-arrow-up-right"></i>
									</a>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2 text-base-content/60 mt-2">
						<i class="fa-duotone fa-house"></i>
						<span class="text-sm">{m.address()}</span>
					</div>
					<FormTextInput {form} name="street" placeholder={m.street()} disabled={!editing} />
					<FormTextInput
						{form}
						name="apartment"
						placeholder={m.streetAddition()}
						disabled={!editing}
					/>
					<FormTextInput {form} name="zip" placeholder={m.zipCode()} disabled={!editing} />
					<FormTextInput {form} name="city" placeholder={m.city()} disabled={!editing} />
					<FormSelect
						{form}
						name="country"
						placeholder={m.pleaseSelectCountry()}
						options={translatedNationCodeAddressFormOptions}
						disabled={!editing}
					/>

					<div class="flex items-center gap-2 text-base-content/60 mt-2">
						<i class="fa-duotone fa-light-emergency-on"></i>
						<span class="text-sm">{m.emergencyContacts()}</span>
					</div>
					<FormTextArea
						{form}
						name="emergencyContacts"
						placeholder={m.emergencyContactsPlaceholder()}
						disabled={!editing}
					/>
				</FormFieldset>
			</div>
		</div>
	</Form>

	<div class="flex justify-end">
		<button class="btn btn-sm {editing ? 'btn-ghost' : 'btn-outline'}" onclick={toggleEdit}>
			{#if editing}
				<i class="fa-duotone fa-xmark"></i>
				{m.cancel()}
			{:else}
				<i class="fa-duotone fa-pen-to-square"></i>
				{m.edit()}
			{/if}
		</button>
	</div>

	<!-- Global Notes -->
	<div class="mt-4 flex flex-col gap-2">
		<h3 class="text-lg font-bold">
			<i class="fa-duotone fa-note-sticky mr-1"></i>
			{m.globalNotes()}
		</h3>
		<p class="text-base-content/60 text-sm">
			{m.globalNotesDescription()}
			{m.globalNotesHint()}
		</p>
		<div class="bg-base-200 min-h-12 rounded-lg p-3 whitespace-pre-wrap">
			{user.globalNotes ?? '–'}
		</div>
		<button class="btn btn-sm btn-outline self-start" onclick={() => (globalNotesOpen = true)}>
			<i class="fa-duotone fa-pen-to-square"></i>
			{m.editGlobalNotes()}
		</button>
	</div>
</div>

<GlobalNotes globalNotes={user.globalNotes ?? ''} bind:open={globalNotesOpen} id={user.id} />
