<script lang="ts">
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from './form-schema.js';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import { translatedNationCodeAddressFormOptions } from '$lib/services/nationTranslationHelper.svelte.js';
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormCheckbox from '$lib/components/Form/FormCheckbox.svelte';
	import type { PageData } from './$houdini';
	import FakeUser from './FakeUser.svelte';
	import { toast } from 'svelte-sonner';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import { dev } from '$app/environment';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(userFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		}
	});

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
		if (data.accountUpdateSuccess && successMap[data.accountUpdateSuccess]) {
			toast.success(successMap[data.accountUpdateSuccess]());
		}
	});

	function accountUrl(path: string) {
		return `${data.accountCenterUrl}/${path}?redirect=${encodeURIComponent(data.accountRedirectUrl)}`;
	}

	const mfaFactors = $derived(data.user.mfaVerificationFactors ?? []);
	const hasPasskey = $derived(mfaFactors.includes('WebAuthn'));
	const hasTotp = $derived(mfaFactors.includes('Totp'));
	const hasBackupCodes = $derived(mfaFactors.includes('BackupCode'));
</script>

{#if data.redirectUrl}
	<div class="backdrop"></div>
{/if}
<div class="flex w-full flex-col items-center p-4 sm:p-10">
	<section class="max-ch-md z-20 mt-10 text-center">
		<p>{m.herYouFindYourAccountInfo()}</p>

		<!-- If this is set we are likely to call this via the registration flow
		 and we want to show a hint -->
		{#if data.redirectUrl}
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
			class="card bg-base-100 border-base-200 z-20 border shadow-xl {data.redirectUrl &&
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

		<div class="card bg-base-100 border-base-200 border shadow-xl">
			<div class="card-body">
				<div class="card-title block text-center">{m.loginInformation()}</div>
				<div class="divide-base-200 divide-y">
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-user text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.loginName()}</div>
							<div class="truncate">{data.user.preferred_username ?? '–'}</div>
						</div>
						<a class="btn btn-ghost btn-sm" href={accountUrl('username')}>
							<i class="fa-duotone fa-pen-to-square"></i>
						</a>
					</div>
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-envelope text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.email()}</div>
							<div class="truncate">{data.user.email}</div>
						</div>
						<a class="btn btn-ghost btn-sm" href={accountUrl('email')}>
							<i class="fa-duotone fa-pen-to-square"></i>
						</a>
					</div>
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-key text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.password()}</div>
							{#if data.user.hasPassword}
								<div>•••••</div>
							{/if}
						</div>
						<a class="btn btn-ghost btn-sm" href={accountUrl('password')}>
							<i class="fa-duotone fa-pen-to-square"></i>
						</a>
					</div>
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-fingerprint text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.passkeys()}</div>
							{#if hasPasskey}
								<div class="text-success text-sm"><i class="fa-duotone fa-check"></i></div>
							{/if}
						</div>
						<a
							class="btn btn-ghost btn-sm"
							href={accountUrl(hasPasskey ? 'passkey/manage' : 'passkey/add')}
						>
							<i class="fa-duotone fa-pen-to-square"></i>
						</a>
					</div>
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-shield-keyhole text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.authenticatorApp()}</div>
							{#if hasTotp}
								<div class="text-success text-sm"><i class="fa-duotone fa-check"></i></div>
							{/if}
						</div>
						<a
							class="btn btn-ghost btn-sm"
							href={accountUrl(hasTotp ? 'authenticator-app/replace' : 'authenticator-app')}
						>
							<i class="fa-duotone fa-pen-to-square"></i>
						</a>
					</div>
					{#if hasPasskey || hasTotp}
						<div class="flex items-center gap-3 py-3">
							<i class="fa-duotone fa-file-shield text-base-content/60 w-5 text-center"></i>
							<div class="flex-1 min-w-0">
								<div class="text-xs text-base-content/60">{m.backupCodes()}</div>
								{#if hasBackupCodes}
									<div class="text-success text-sm"><i class="fa-duotone fa-check"></i></div>
								{/if}
							</div>
							<a
								class="btn btn-ghost btn-sm"
								href={accountUrl(hasBackupCodes ? 'backup-codes/manage' : 'backup-codes/generate')}
							>
								<i class="fa-duotone fa-pen-to-square"></i>
							</a>
						</div>
					{/if}
					{#if data.user.ssoIdentities?.length || data.user.socialIdentities?.length}
						<div class="flex items-center gap-3 py-3">
							<i class="fa-duotone fa-link text-base-content/60 w-5 text-center"></i>
							<div class="flex-1 min-w-0">
								<div class="text-xs text-base-content/60">{m.ssoIdentities()}</div>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each data.user.socialIdentities ?? [] as provider}
										<span class="badge badge-sm capitalize">{provider}</span>
									{/each}
									{#each data.user.ssoIdentities ?? [] as sso}
										<span class="badge badge-sm">{sso.issuer}</span>
									{/each}
								</div>
							</div>
						</div>
					{/if}
					<div class="flex items-center gap-3 py-3">
						<i class="fa-duotone fa-binary text-base-content/60 w-5 text-center"></i>
						<div class="flex-1 min-w-0">
							<div class="text-xs text-base-content/60">{m.userId()}</div>
							<div class="truncate font-mono text-sm">{data.user.sub}</div>
						</div>
					</div>
					{#if data.user.myOIDCRoles.length}
						<div class="flex items-center gap-3 py-3">
							<i class="fa-duotone fa-user-lock text-base-content/60 w-5 text-center"></i>
							<div class="flex-1 min-w-0">
								<div class="text-xs text-base-content/60">{m.rights()}</div>
								<div>{data.user.myOIDCRoles.map((x) => x.toUpperCase()).join(', ')}</div>
							</div>
						</div>
					{/if}
				</div>
				<p class="mt-4 text-center text-sm">{@html m.deleteAccountGPDR()}</p>
			</div>
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
