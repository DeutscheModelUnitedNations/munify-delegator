<script lang="ts">
	import Form from '$lib/components/form/Form.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { m } from '$lib/paraglide/messages';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from './form-schema.js';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import { translatedNationCodeAddressFormOptions } from '$lib/utils/nationTranslationHelper.svelte';
	import FormDateTimeInput from '$lib/components/form/FormDateTimeInput.svelte';
	import FormCheckbox from '$lib/components/form/FormCheckbox.svelte';
	import LoginInformationCard from './LoginInformationCard.svelte';
	import { toast } from 'svelte-sonner';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import FormSection from '$lib/components/form/FormSection.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { buildUserFormValues, toUpdateUserArgs } from '$lib/api/userFormValues';
	import AddressRegionField from '$lib/components/form/AddressRegionField.svelte';
	import { addressRules } from '$lib/helpers/addressRules';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	const user = await getCurrentUser();

	/**
	 * Where to continue once the profile is complete. Set by the login callback when it sends
	 * someone here to fill in missing details; only same-origin paths are honoured.
	 */
	const redirectUrl = $derived.by(() => {
		const target = page.url.searchParams.get('redirect');
		if (!target) return undefined;
		return new URL(target, page.url.origin).host === page.url.host ? target : undefined;
	});

	// Seeded once: this is the form's initial value, and re-reading the row while someone edits it
	// would throw their changes away.
	const stored = await client.query.user({
		__args: { id: user.sub },
		givenName: true,
		familyName: true,
		birthday: true,
		phone: true,
		street: true,
		apartment: true,
		zip: true,
		city: true,
		region: true,
		country: true,
		gender: true,
		pronouns: true,
		foodPreference: true,
		emergencyContacts: true,
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true
	});

	const form = superForm(
		defaults(
			{
				...buildUserFormValues(stored),
				wantsToReceiveGeneralInformation: stored?.wantsToReceiveGeneralInformation ?? false,
				wantsJoinTeamInformation: stored?.wantsJoinTeamInformation ?? false
			},
			zod4Client(userFormSchema)
		),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(userFormSchema),
			onError(e) {
				toast.error(e.result.error.message);
			},
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.updateUser({
					__args: toUpdateUserArgs(user.sub, validated.data),
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				const target = redirectUrl;
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- runtime same-origin path from ?redirect=, checked in redirectUrl; resolve() only takes typed routes
				if (target) await goto(target);
			}
		}
	);

	//TODO pronoun prefill

	const { form: formData } = form;
	// which of postal code, city and region the picked country's addresses use
	const address = $derived(addressRules($formData.country));

	// Show toast for successful account center updates
	$effect(() => {
		const successMap: Record<string, () => string> = {
			email: () => m.accountUpdateSuccessEmail(),
			password: () => m.accountUpdateSuccessPassword(),
			username: () => m.accountUpdateSuccessUsername(),
			passkey: () => m.accountUpdateSuccessPasskey(),
			mfa: () => m.accountUpdateSuccessMfa(),
			'backup-codes': () => m.accountUpdateSuccessBackupCodes()
		};
		const success = page.url.searchParams.get('show_success');
		if (success && successMap[success]) {
			toast.success(successMap[success]());
		}
	});
</script>

{#if redirectUrl}
	<div class="backdrop"></div>
{/if}
<div class="flex w-full flex-col items-center p-4 sm:p-10">
	<section class="max-ch-md z-20 mt-6 text-center">
		<p>{m.herYouFindYourAccountInfo()}</p>

		<!-- If this is set we are likely to call this via the registration flow
		 and we want to show a hint -->
		{#if redirectUrl}
			<div class="alert alert-warning mt-10">
				<i class="fas fa-exclamation-triangle text-3xl"></i>
				<div>
					<h2 class="text-xl font-bold">{m.completeData()}</h2>
					<p>
						{m.completeDataExplaination()}
					</p>
				</div>
			</div>
		{/if}
	</section>
	<div
		class="mt-10 grid w-full max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
	>
		<div
			class="card bg-base-100 border-base-200 z-20 border shadow-xl {redirectUrl &&
				'highlight-card'}"
		>
			<div class="card-body bg-base-100 rounded-box">
				<h2 class="card-title mb-4 justify-center">
					<i class="fa-sharp-duotone fa-solid fa-user-pen text-primary"></i>
					{m.personalData()}
				</h2>
				<Form {form}>
					<FormSection title={m.contactInformation()} icon="address-book">
						<p class="text-base-content/60 text-xs">
							<span class="font-semibold">{m.legalName()}:</span>
							{m.legalNameDisclaimer()}
						</p>
						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
							<FormTextInput
								{form}
								name="given_name"
								label={m.firstName()}
								placeholder={m.firstName()}
							/>
							<FormTextInput
								{form}
								name="family_name"
								label={m.lastName()}
								placeholder={m.lastName()}
							/>
						</div>
						<FormTextInput
							{form}
							name="phone"
							label={m.phoneNumber()}
							placeholder="+49 123456789"
						/>
						<FormTextArea
							{form}
							name="emergencyContacts"
							label={m.emergencyContacts()}
							description={m.emergencyContactDescription()}
							placeholder={m.emergencyContactsPlaceholder()}
						/>
					</FormSection>
					<FormSection title={m.address()} icon="house">
						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[2fr_1fr]">
							<FormTextInput {form} name="street" label={m.street()} placeholder={m.street()} />
							<FormTextInput
								{form}
								name="apartment"
								label={m.streetAddition()}
								placeholder={m.streetAddition()}
							/>
						</div>
						<FormSelect
							{form}
							name="country"
							label={m.country()}
							placeholder={m.pleaseSelectCountry()}
							options={translatedNationCodeAddressFormOptions}
						/>
						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_2fr]">
							{#if address.zip}
								<FormTextInput {form} name="zip" label={m.zipCode()} placeholder={m.zipCode()} />
							{/if}
							{#if address.city}
								<FormTextInput {form} name="city" label={m.city()} placeholder={m.city()} />
							{/if}
						</div>
						<AddressRegionField {form} name="region" rules={address} />
					</FormSection>
					<FormSection title={m.aboutYou()} icon="user">
						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
							<FormDateTimeInput
								{form}
								name="birthday"
								label={m.birthDate()}
								defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
								enableFutureDates={false}
							/>
							<FormSelect
								{form}
								name="gender"
								label={m.gender()}
								options={[
									{ value: 'MALE', label: m.male() },
									{ value: 'FEMALE', label: m.female() },
									{ value: 'DIVERSE', label: m.diverse() },
									{ value: 'NO_STATEMENT', label: m.noStatement() }
								]}
							/>
							<FormTextInput
								{form}
								name="pronouns"
								placeholder={m.pronounsExample()}
								label={m.pronouns()}
							/>
							<FormSelect
								{form}
								name="foodPreference"
								label={m.diet()}
								options={[
									{ value: 'VEGAN', label: m.vegan() },
									{ value: 'VEGETARIAN', label: m.vegetarian() },
									{ value: 'OMNIVORE', label: m.omnivore() }
								]}
							/>
						</div>
					</FormSection>
					<FormSection title={m.newsletters()} icon="envelope-open-text">
						<FormCheckbox
							{form}
							name="wantsToReceiveGeneralInformation"
							label={m.receiveGeneralInformation()}
						/>
						<FormCheckbox
							{form}
							name="wantsJoinTeamInformation"
							label={m.receiveJoinTeamInformation()}
						/>
					</FormSection>
				</Form>
			</div>
		</div>

		<div class="lg:sticky lg:top-6">
			<LoginInformationCard {user} />
		</div>
	</div>
</div>

<style>
	@property --angle {
		syntax: '<angle>';
		initial-value: 0deg;
		inherits: false;
	}

	.backdrop {
		content: '';
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.1);
		z-index: 10;
		backdrop-filter: blur(3px);
	}

	.highlight-card {
		position: relative;
		z-index: 10;
	}

	.highlight-card::before,
	.highlight-card::after {
		content: '';
		position: absolute;
		background: conic-gradient(
			from var(--angle),
			#3d7cd2 0%,
			transparent 10%,
			transparent 40%,
			#3d7cd2 50%,
			transparent 60%,
			transparent 90%,
			#3d7cd2 100%
		);
		width: calc(100% + 8px);
		height: calc(100% + 8px);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: -1;
		border-radius: 0.8rem;
		animation: spin 6s linear infinite;
	}

	.highlight-card::before {
		filter: blur(10px);
	}

	@keyframes spin {
		0% {
			--angle: 0deg;
		}
		100% {
			--angle: 360deg;
		}
	}
</style>
