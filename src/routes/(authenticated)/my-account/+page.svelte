<script lang="ts">
	import { apiClient } from '$api/client.js';
	import { goto } from '$app/navigation';
	import Footer from '$lib/components/Footer.svelte';
	import ProfileInput from '$lib/components/ProfileInput.svelte';
	import ProfileSelect from '$lib/components/ProfileSelect.svelte';
	import addressCountries from '$lib/helper/addressCountries.js';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName.js';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	// TODO form validation
	// we should resort to some form library here
	let api = apiClient({ origin: data.url.origin });

	let phone = $state(data.fullUser.phone ?? '');
	let street = $state(data.fullUser.street ?? '');
	let apartment = $state(data.fullUser.apartment ?? '');
	let zip = $state(data.fullUser.zip ?? '');
	let city = $state(data.fullUser.city ?? '');
	let country = $state(data.fullUser.country ?? '');
	let birthday = $state(data.fullUser.birthday as unkown as string ?? new Date().toISOString());
	let gender = $state(data.fullUser.gender ?? '');
	let pronouns = $state(data.fullUser.pronouns ?? '');
	let foodPreference = $state(data.fullUser.foodPreference ?? '');

	const onPersonalDataFormSubmit = async (e: Event) => {
		e.preventDefault();

		await api.user.me.patch({
			phone,
			street,
			apartment,
			zip,
			city,
			country,
			birthday,
			gender,
			pronouns,
			foodPreference
		});

		if (data.redirectUrl) {
			goto(data.redirectUrl);
		}
		//TODO notify user of success
	};
</script>

{#if data.redirectUrl}
	<div class="backdrop"></div>
{/if}

<div class="w-full flex flex-col items-center p-4 sm:p-10">
	<section class="text-center max-ch-md mt-10 z-20">
		<i class="fa-duotone fa-user text-5xl mb-3"></i>
		<h1 class="text-2xl font-bold">{m.myAccount()}</h1>
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
	<div class="flex gap-10 flex-wrap justify-center items-start mt-10">
		<div
			class="card max-w-80 sm:max-w-full sm:min-w-96 bg-base-100 dark:bg-base-200 shadow-xl z-20 {data.redirectUrl &&
				'highlight-card'}"
		>
			<div class="card-body bg-base-100 dark:bg-base-200 rounded-2xl">
				<div class="card-title block text-center">{m.personalData()}</div>
				<form class="flex flex-col gap-4" onsubmit={onPersonalDataFormSubmit}>
					<ProfileInput
						label={m.phoneNumber()}
						bind:value={phone}
						placeholder="+49 1234567890"
						required
						pattern={`^\+\d{6,14}$`}
						defaultValue="+49"
						type="tel"
					/>
					<ProfileInput bind:value={street} label={m.address()} placeholder={m.street()} required />
					<ProfileInput bind:value={apartment} placeholder={m.streetAddition()} />
					<ProfileInput bind:value={zip} placeholder={m.zipCode()} required />
					<ProfileInput bind:value={city} placeholder={m.city()} required />
					<ProfileSelect
						bind:value={country}
						placeholder={m.pleaseSelectCountry()}
						options={addressCountries
							.map((c) => ({ value: c.iso_code, label: countryCodeToLocalName(c.iso_code, 'de') })) // TODO Add locale
							.sort((a, b) => a.label.localeCompare(b.label))}
						required
					/>
					<!-- TODO seems to be broken -->
					<ProfileInput
						bind:value={birthday}
						label={m.birthDate()}
						placeholder={m.birthDate()}
						required
						type="date"
						pattern="^[0-3]\d[\.[0-1]\d\.\d{4}$"
						max={new Date(
							new Date().getFullYear() - 10,
							new Date().getMonth(),
							new Date().getDate()
						)
							.toISOString()
							.split('T')[0]}
					/>
					<ProfileSelect
						bind:value={gender}
						label={m.gender()}
						placeholder={m.pleaseSelect()}
						options={[
							{ value: 'm', label: m.male() },
							{ value: 'f', label: m.female() },
							{ value: 'd', label: m.diverse() },
							{ value: 'n', label: m.unspecified() }
						]}
						required
					/>

					<ProfileInput
						bind:value={pronouns}
						label={m.pronouns()}
						placeholder={m.pronounsExample()}
						required
					/>

					<ProfileSelect
						bind:value={foodPreference}
						label={m.diet()}
						placeholder={m.pleaseSelect()}
						options={[
							{ value: 'VEGAN', label: m.vegan() },
							{ value: 'VEGETARIAN', label: m.vegetarian() },
							{ value: 'OMNIVORE', label: m.omnivore() }
						]}
						required
					/>
					<button class="btn btn-primary btn-block mt-4" type="submit">
						{#if !data.redirectUrl}
							{m.save()}
							<i class="fas fa-save"></i>
						{:else}
							{m.saveAndContinue()}
							<i class="fas fa-arrow-right"></i>
						{/if}
					</button>
				</form>
			</div>
		</div>

		<div class="card w-full md:w-auto md:min-w-96 bg-base-100 dark:bg-base-200 shadow-xl">
			<div class="card-body">
				<div class="card-title block text-center">{m.loginInformation()}</div>
				<table class="table">
					<tbody>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-envelope"></i></td>
							<td>{m.email()}</td>
							<td>{data.fullUser.email}</td>
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
							<td>{data.fullUser.given_name}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-text"></i></td>
							<td>{m.lastName()}</td>
							<td>{data.fullUser.family_name}</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-binary"></i></td>
							<td>{m.userId()}</td>
							<td>{data.fullUser.id}</td>
						</tr>
					</tbody>
				</table>
				<a class="btn btn-primary btn-block mt-4" href="https://guard.munify.cloud" target="_blank">
					{m.edit()}
					<i class="fas fa-arrow-up-right-from-square"></i>
				</a>
			</div>
		</div>
	</div>
	<Footer />
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
