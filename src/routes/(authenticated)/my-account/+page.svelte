<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import ProfileInput from '$lib/components/ProfileInput.svelte';
	import ProfileSelect from '$lib/components/ProfileSelect.svelte';
	import addressCountries from '$lib/helper/addressCountries.js';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName.js';

	let { data } = $props();

	let telephone = $state('');
	let street = $state('');
	let apartment = $state('');
	let zip = $state('');
	let city = $state('');
	let country = $state('DE');
	let birthday = $state('');
	let gender = $state('');
	let pronouns = $state('');
	let foodPreference = $state('');

	let personalDataComplete = $state(!data.redirectUrl);

	const onPersonalDataFormSubmit = (e: Event) => {
		e.preventDefault();
		if (personalDataComplete || !data.redirectUrl) return;
		personalDataComplete = true;
		window.location.href = data.redirectUrl;
	};
</script>

{#if !personalDataComplete}
	<div class="backdrop"></div>
{/if}

<div class="w-full flex flex-col items-center p-4 sm:p-10">
	<section class="text-center max-ch-md mt-10 z-20">
		<i class="fa-duotone fa-user text-5xl mb-3"></i>
		<h1 class="text-2xl font-bold">Mein Konto</h1>
		<p>Hier findest du alle Informationen und Präferenzen zu deinem Konto.</p>

		{#if data.redirectUrl}
			<div class="alert alert-warning mt-10">
				<i class="fas fa-exclamation-triangle text-3xl"></i>
				<div>
					<h2 class="text-xl font-bold">Daten Vervollständigen</h2>
					<p>
						Vielen Dank für deine Registrierung. Bitte vervollständige deine persönlichen Daten, um
						deine Anmeldung abzuschließen.
					</p>
					<p>
						Danach kannst du da weitermachen, wo du eigentlich hin wolltest. Wenn du auf Speichern
						klickst, wirst du automatisch weitergeleitet.
					</p>
				</div>
			</div>
		{/if}
	</section>
	<div class="flex gap-10 flex-wrap justify-center items-start mt-10">
		<div
			class="card max-w-80 sm:max-w-full sm:min-w-96 bg-base-100 dark:bg-base-200 shadow-xl z-20 {!personalDataComplete &&
				'highlight-card'}"
		>
			<div class="card-body bg-base-100 dark:bg-base-200 rounded-2xl">
				<div class="card-title block text-center">Persönliche Daten</div>
				<form class="flex flex-col gap-4" onsubmit={onPersonalDataFormSubmit}>
					<ProfileInput
						label="Handynummer"
						bind:value={telephone}
						placeholder="+491234567890"
						required
						pattern={`^\+\d{6,14}$`}
						defaultValue="+49"
						type="tel"
					/>
					<ProfileInput bind:value={street} label="Adresse" placeholder="Straße" required />
					<ProfileInput bind:value={apartment} placeholder="ggf. Zusatz" />
					<ProfileInput bind:value={zip} placeholder="PLZ" required />
					<ProfileInput bind:value={city} placeholder="Ort" required />
					<ProfileSelect
						bind:value={country}
						placeholder="Bitte Land auswählen"
						options={addressCountries
							.map((c) => ({ value: c.iso_code, label: countryCodeToLocalName(c.iso_code, 'de') })) // TODO Add locale
							.sort((a, b) => a.label.localeCompare(b.label))}
						required
					/>
					<ProfileInput
						bind:value={birthday}
						label="Geburtstag"
						placeholder="Geburtstag"
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
						label="Geschlecht"
						placeholder="Bitte auswählen"
						options={[
							{ value: 'm', label: 'Männlich' },
							{ value: 'f', label: 'Weiblich' },
							{ value: 'd', label: 'Divers' },
							{ value: 'n', label: 'Keine Angabe' }
						]}
						required
					/>

					<ProfileInput
						bind:value={pronouns}
						label="Pronomen"
						placeholder="z.B. er/ihm oder sie/ihr"
						required
					/>

					<ProfileSelect
						bind:value={foodPreference}
						label="Ernährungsweise"
						placeholder="Bitte auswählen"
						options={[
							{ value: 'vegan', label: 'Vegan' },
							{ value: 'vegetarian', label: 'Vegetarisch' },
							{ value: 'all', label: 'Keine Präferenz' }
						]}
						required
					/>
					<button class="btn btn-primary btn-block mt-4" type="submit">
						{#if personalDataComplete}
							Speichern
							<i class="fas fa-save"></i>
						{:else}
							Speichern und Weiter
							<i class="fas fa-arrow-right"></i>
						{/if}
					</button>
				</form>
			</div>
		</div>

		<div class="card w-full md:w-auto md:min-w-96 bg-base-100 dark:bg-base-200 shadow-xl">
			<div class="card-body">
				<div class="card-title block text-center">Anmeldeinformationen</div>
				<table class="table">
					<tbody>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-left-to-bracket"></i></td>
							<td>Loginname</td>
							<td>m.m@mail.com</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-key"></i></td>
							<td>Passwort</td>
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
							<td>Vorname</td>
							<td>Max</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-text"></i></td>
							<td>Nachname</td>
							<td>Muster</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-envelope"></i></td>
							<td>E-Mail</td>
							<td>m.m@mail.com</td>
						</tr>
						<tr>
							<td class="text-center"><i class="fa-duotone fa-binary"></i></td>
							<td>User-ID</td>
							<td>{data.accountData.uid}</td>
						</tr>
					</tbody>
				</table>
				<a class="btn btn-primary btn-block mt-4" href="https://guard.munify.cloud" target="_blank">
					Bearbeiten
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
