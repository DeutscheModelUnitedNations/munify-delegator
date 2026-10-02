<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { downloadPostalRegistration } from '$lib/api/postalRegistrationPdf';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = $derived(await getCurrentUser());

	const [conference, userQueryData] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: params.conferenceId },
				startConference: true,
				postalName: true,
				postalStreet: true,
				postalApartment: true,
				postalZip: true,
				postalCity: true,
				postalCountry: true
			}),
			client.liveQuery.user({
				__args: { id: currentUser.sub },
				givenName: true,
				familyName: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				birthday: true
			})
		])
	);

	let userDataNotComplete = $derived(
		!(
			userQueryData.street &&
			userQueryData.zip &&
			userQueryData.city &&
			userQueryData.country &&
			userQueryData.birthday
		)
	);

	let loading = $state(false);

	async function handleGeneratePDF() {
		loading = true;
		try {
			await downloadPostalRegistration(currentUser.sub, params.conferenceId);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Add error handling and loading states -->
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>
	<!-- TODO i18n this once the thing is fully implemented -->
	<div class="prose mt-4">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html m.postalRegistrationInstructions({
			conferenceStart: conference.startConference
				? new Date(conference.startConference).toLocaleDateString()
				: 'Date unknown'
		})}

		{#if userDataNotComplete}
			<div class="alert alert-warning mt-4">
				<i class="fas fa-exclamation-triangle text-3xl"></i>
				<div class="flex flex-col gap-2 items-start">
					<div>{m.completeAddressAndBirthdayForPostalRegistration()}</div>
					<a
						class="btn no-underline"
						href={resolve(
							`/my-account?redirect=${encodeURIComponent(`${page.url.origin}/dashboard/${params.conferenceId}`)}`
						)}
					>
						{m.updateProfile()}
						<i class="fas fa-user-edit"></i>
					</a>
				</div>
			</div>
		{:else}
			<div class="alert alert-info mt-4">
				<div class="flex flex-col gap-2 items-start">
					<div>{m.checkYourAddressAndBirthday()}</div>
					<div class="grid grid-cols-[auto_1fr] gap-4 items-center bg-base-100 p-4 rounded-box">
						<i class="fa-duotone fa-user"></i>
						<div>
							{userQueryData.givenName}
							{userQueryData.familyName}
						</div>
						<i class="fa-duotone fa-home"></i>
						<div>
							{userQueryData.street}
							{userQueryData.apartment ? `, ${userQueryData.apartment}` : ''}<br />
							{userQueryData.zip}
							{userQueryData.city}<br />
							{userQueryData.country}
						</div>
						<i class="fa-duotone fa-cake-candles"></i>
						<div>
							{userQueryData.birthday ? new Date(userQueryData.birthday).toLocaleDateString() : ''}
						</div>
					</div>
					<a class="btn no-underline" href={resolve('/my-account')}>
						{m.updateProfile()}
						<i class="fas fa-user-edit"></i>
					</a>
				</div>
			</div>
		{/if}

		<button
			class="btn btn-primary btn-xl mt-8"
			onclick={handleGeneratePDF}
			disabled={loading || userDataNotComplete}
		>
			{#if loading}
				<i class="fas fa-spinner fa-spin"></i>
				{m.documentsAreBeingPrepared()}
			{:else if userDataNotComplete}
				<i class="fas fa-lock"></i>
				{m.downloadDocuments()}
			{:else}
				<i class="fas fa-download"></i>
				{m.downloadDocuments()}
			{/if}
		</button>

		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html m.postalRegistrationFAQ1()}
		<div class="card bg-base-200 shadow-lg">
			<div class="card-body gap-10 sm:flex-row">
				<i class="fa-duotone fa-mailbox-flag-up text-5xl"></i>
				<address class="text-lg sm:text-xl">
					<strong>{conference.postalName}</strong><br /><span>{conference.postalStreet}</span><br />
					{#if conference.postalApartment}
						<span>{conference.postalApartment}</span><br />
					{/if}
					<br />
					<span>{conference.postalZip} {conference.postalCity}</span><br />
					<span>{conference.postalCountry}</span>
				</address>
			</div>
		</div>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html m.postalRegistrationFAQ2()}
	</div>
</div>
