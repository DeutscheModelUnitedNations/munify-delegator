<script lang="ts">
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from '../../../../routes/(authenticated)/my-account/form-schema';
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { translatedNationCodeAddressFormOptions } from '$lib/services/nationTranslationHelper.svelte';
	import { toast } from 'svelte-sonner';
	import GlobalNotes from '../../../../routes/(authenticated)/management/[conferenceId]/participants/GlobalNotes.svelte';

	interface Props {
		user:
			| {
					id: string;
					given_name: string;
					family_name: string;
					pronouns?: string | null;
					phone?: string | null;
					email?: string | null;
					street?: string | null;
					apartment?: string | null;
					zip?: string | null;
					city?: string | null;
					country?: string | null;
					gender?: string | null;
					birthday?: Date | string | null;
					foodPreference?: string | null;
					emergencyContacts?: string | null;
					globalNotes?: string | null;
			  }
			| null
			| undefined;
		userId: string;
		conferenceId: string;
		conference:
			| { id: string; startConference?: string | null; endConference?: string | null }
			| null
			| undefined;
		onUpdate?: () => void;
	}

	let { user, userId, conferenceId, conference, onUpdate }: Props = $props();

	let editing = $state(false);
	let globalNotesOpen = $state(false);

	// Admin form schema - omit newsletter preferences (personal user choice)
	const adminFormSchema = userFormSchema.omit({
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true
	});

	type Gender = 'MALE' | 'FEMALE' | 'DIVERSE' | 'NO_STATEMENT';
	type FoodPreference = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN';

	function toGender(value: string | null | undefined): Gender {
		if (value === 'MALE' || value === 'FEMALE' || value === 'DIVERSE' || value === 'NO_STATEMENT') {
			return value;
		}
		return 'NO_STATEMENT';
	}

	function toFoodPreference(value: string | null | undefined): FoodPreference {
		if (value === 'OMNIVORE' || value === 'VEGETARIAN' || value === 'VEGAN') {
			return value;
		}
		return 'OMNIVORE';
	}

	function buildFormData() {
		return {
			given_name: user?.given_name ?? '',
			family_name: user?.family_name ?? '',
			birthday:
				user?.birthday instanceof Date
					? user.birthday
					: user?.birthday
						? new Date(user.birthday)
						: new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000),
			phone: user?.phone ?? '',
			street: user?.street ?? '',
			apartment: user?.apartment ?? null,
			zip: user?.zip ?? '',
			city: user?.city ?? '',
			country: user?.country ?? '',
			gender: toGender(user?.gender),
			pronouns: user?.pronouns ?? null,
			foodPreference: toFoodPreference(user?.foodPreference),
			emergencyContacts: user?.emergencyContacts ?? ''
		};
	}

	const updateUserMutation = graphql(`
		mutation UpdateUserFromAdminCard($data: UserUpdateDataInput!, $where: UserWhereUniqueInput!) {
			updateOneUser(where: $where, data: $data) {
				id
			}
		}
	`);

	const initialData = defaults(buildFormData(), zod4Client(adminFormSchema));

	const form = superForm(initialData, {
		SPA: true,
		validators: zod4Client(adminFormSchema),
		resetForm: false,
		validationMethod: 'oninput',
		async onUpdate({ form: updatedForm }) {
			if (!updatedForm.valid) return;

			const promise = updateUserMutation.mutate({
				data: updatedForm.data,
				where: { id: userId }
			});

			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: m.saved(),
				error: m.httpGenericError()
			});

			try {
				await promise;
				editing = false;
				cache.markStale();
				await invalidateAll();
				onUpdate?.();
			} catch {
				// Error already shown by toast.promise
			}
		}
	});

	const { form: formData } = form;

	function toggleEdit() {
		if (editing) {
			$formData = buildFormData();
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
		switch (user?.gender) {
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
		switch (user?.foodPreference) {
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

{#if user}
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
							<FormSelect
								{form}
								name="gender"
								options={[
									{ value: 'MALE', label: m.male() },
									{ value: 'FEMALE', label: m.female() },
									{ value: 'DIVERSE', label: m.diverse() },
									{ value: 'NO_STATEMENT', label: m.noStatement() }
								]}
								disabled={!editing}
							/>
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
								options={[
									{ value: 'VEGAN', label: m.vegan() },
									{ value: 'VEGETARIAN', label: m.vegetarian() },
									{ value: 'OMNIVORE', label: m.omnivore() }
								]}
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
											onclick={() => copyToClipboard(user?.email ?? '')}
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
			<p class="text-base-content/60 text-sm">{m.globalNotesDescription()}</p>
			<div class="bg-base-200 min-h-12 rounded-lg p-3 whitespace-pre-wrap">
				{user.globalNotes ?? '–'}
			</div>
			<button class="btn btn-sm btn-outline self-start" onclick={() => (globalNotesOpen = true)}>
				<i class="fa-duotone fa-pen-to-square"></i>
				{m.editGlobalNotes()}
			</button>
		</div>
	</div>
{/if}

{#if user}
	<GlobalNotes globalNotes={user.globalNotes ?? ''} bind:open={globalNotesOpen} id={user.id} />
{/if}
