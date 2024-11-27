<script lang="ts">
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from './form-schema.js';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import { translatedNationCodeAddressFormOptions } from '$lib/services/nationTranslationHelper.svelte.js';
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormCheckbox from '$lib/components/Form/FormCheckbox.svelte';
	import type { PageData } from './$houdini';
	import { toast } from '@zerodevx/svelte-toast';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(userFormSchema),
		onError(e) {
			toast.push(e.result.error.message);
		}
	});

	//TODO pronoun prefill
</script>

{#if data.redirectUrl}
	<div class="backdrop"></div>
{/if}
<div class="flex w-full flex-col items-center p-4 sm:p-10">
	<section class="z-20 mt-10 text-center max-ch-md">
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
	<div class="mt-10 flex flex-wrap items-start justify-center gap-10">
		<div
			class="card z-20 max-w-80 bg-base-100 shadow-xl sm:min-w-96 sm:max-w-full dark:bg-base-200 {data.redirectUrl &&
				'highlight-card'}"
		>
			<div class="card-body rounded-2xl bg-base-100 dark:bg-base-200">
				<div class="card-title block text-center">{m.personalData()}</div>
				<Form {form}>
					<FormTextInput {form} name="phone" label={m.phoneNumber()} placeholder="+49 123456789" />
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
					<FormDateTimeInput
						{form}
						name="birthday"
						label={m.birthDate()}
						defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
					/>
					<FormSelect
						{form}
						name="gender"
						label={m.gender()}
						options={[
							{ value: 'm', label: m.male() },
							{ value: 'f', label: m.female() },
							{ value: 'd', label: m.diverse() },
							{ value: 'n', label: m.noStatement() }
						]}
					/>
					<FormTextInput
						{form}
						name="pronouns"
						placeholder={m.pronounsSheHer()}
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
				</Form>
			</div>
		</div>

		<div class="card w-full bg-base-100 shadow-xl md:w-auto md:min-w-96 dark:bg-base-200">
			<div class="card-body">
				<div class="card-title block text-center">{m.loginInformation()}</div>
				<table class="table">
					<tbody>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-envelope"></i></td>
							<td>{m.email()}</td>
							<td>{data.user.email}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-key"></i></td>
							<td>{m.password()}</td>
							<td>
								<i class="fa-solid fa-asterisk text-xs"></i>
								<i class="fa-solid fa-asterisk text-xs"></i>
								<i class="fa-solid fa-asterisk text-xs"></i>
								<i class="fa-solid fa-asterisk text-xs"></i>
								<i class="fa-solid fa-asterisk text-xs"></i>
							</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-text"></i></td>
							<td>{m.firstName()}</td>
							<td>{data.user.given_name}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-text"></i></td>
							<td>{m.lastName()}</td>
							<td>{data.user.family_name}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-binary"></i></td>
							<td>{m.userId()}</td>
							<td>{data.user.sub}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-user-lock"></i></td>
							<td>{m.rights()}</td>
							<td>{data.user.myOIDCRoles.map((x) => x.toUpperCase()).join(', ')}</td>
						</tr>
					</tbody>
				</table>
				<a class="btn btn-primary btn-block mt-4" href="https://guard.munify.cloud" target="_blank">
					{m.edit()}
					<i class="fas fa-arrow-up-right-from-square"></i>
				</a>
				<!-- <p class="mt-6 max-w-[40ch] text-center text-sm">{@html m.deleteAccountGPDR()}</p> -->
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
		border-radius: 1.2rem;
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
