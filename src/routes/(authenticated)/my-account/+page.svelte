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
	import FakeUser from './FakeUser.svelte';
	import LoginInformationCard from './LoginInformationCard.svelte';
	import { toast } from 'svelte-sonner';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import { dev } from '$app/environment';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { buildUserFormValues } from '$lib/api/userFormValues';
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
				const { given_name, family_name, ...values } = validated.data;
				const promise = client.mutate.updateUser({
					__args: { ...values, id: user.sub, givenName: given_name, familyName: family_name },
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
	<section class="max-ch-md z-20 mt-10 text-center">
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
	<div class="mt-10 grid w-full max-w-4xl grid-cols-1 items-start gap-10 lg:grid-cols-2">
		<div
			class="card bg-base-100 border-base-200 z-20 border shadow-xl {redirectUrl &&
				'highlight-card'}"
		>
			<div class="card-body bg-base-100 rounded-box">
				{#if dev}
					<FakeUser {form} />
				{/if}
				<div class="card-title block text-center">{m.personalData()}</div>
				<Form {form}>
					<FormFieldset title={m.legalName()}>
						<div class="alert alert-info mb-4">
							<i class="fa-duotone fa-info-circle shrink-0"></i>
							<span class="flex-1 min-w-0">{m.legalNameDisclaimer()}</span>
						</div>
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
					</FormFieldset>
					<FormFieldset title={m.contactInformation()}>
						<FormTextInput
							{form}
							name="phone"
							label={m.phoneNumber()}
							placeholder="+49 123456789"
						/>
						<FormTextInput {form} name="street" label={m.address()} placeholder={m.street()} />
						<FormTextInput {form} name="apartment" placeholder={m.streetAddition()} />
						<FormTextInput {form} name="zip" placeholder={m.zipCode()} />
						<FormTextInput {form} name="city" placeholder={m.city()} />
						<FormSelect
							{form}
							name="country"
							placeholder={m.pleaseSelectCountry()}
							options={translatedNationCodeAddressFormOptions}
						/>
						<FormTextArea
							{form}
							name="emergencyContacts"
							label={m.emergencyContacts()}
							description={m.emergencyContactDescription()}
							placeholder={m.emergencyContactsPlaceholder()}
						/>
					</FormFieldset>
					<FormFieldset title={m.personalInformation()}>
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
					</FormFieldset>
					<FormFieldset title={m.newsletters()}>
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
					</FormFieldset>
				</Form>
			</div>
		</div>

		<LoginInformationCard {user} />
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
