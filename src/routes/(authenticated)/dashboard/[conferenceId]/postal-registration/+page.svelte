<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import { getLocale } from '#lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { client } from '#lib/api/rumbleClient/client';
	import { downloadPostalRegistration } from '#lib/api/postalRegistrationPdf';
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
			await downloadPostalRegistration({
				userId: currentUser.sub,
				conferenceId: params.conferenceId
			});
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex w-full flex-col gap-6">
	<BackToDashboard conferenceId={params.conferenceId} />
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>

	<div
		class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]"
	>
		<div class="prose max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html m.postalRegistrationInstructions({
				conferenceStart: conference.startConference
					? new Date(conference.startConference).toLocaleDateString(getLocale())
					: 'Date unknown'
			})}
		</div>

		<aside class="flex flex-col gap-4 lg:sticky lg:top-4">
			<div class="card bg-base-200 shadow-lg">
				<div class="card-body gap-4">
					{#if userDataNotComplete}
						<div role="alert" class="alert alert-warning">
							<i class="fas fa-exclamation-triangle text-2xl"></i>
							<span>{m.completeAddressAndBirthdayForPostalRegistration()}</span>
						</div>
						<a
							class="btn"
							href={resolve(
								`my-account?redirect=${encodeURIComponent(`${page.url.origin}/dashboard/${params.conferenceId}`)}`
							)}
						>
							<i class="fas fa-user-edit"></i>
							{m.updateProfile()}
						</a>
					{:else}
						<p>{m.checkYourAddressAndBirthday()}</p>
						<div class="bg-base-100 grid grid-cols-[auto_1fr] items-center gap-4 rounded-box p-4">
							<i class="fa-sharp-duotone fa-solid fa-user"></i>
							<div>
								{userQueryData.givenName}
								{userQueryData.familyName}
							</div>
							<i class="fa-sharp-duotone fa-solid fa-home"></i>
							<div>
								{userQueryData.street}
								{userQueryData.apartment ? `, ${userQueryData.apartment}` : ''}<br />
								{userQueryData.zip}
								{userQueryData.city}<br />
								{userQueryData.country}
							</div>
							<i class="fa-sharp-duotone fa-solid fa-cake-candles"></i>
							<div>
								{userQueryData.birthday
									? new Date(userQueryData.birthday).toLocaleDateString(getLocale())
									: ''}
							</div>
						</div>
						<a class="btn btn-ghost btn-sm self-start" href={resolve('my-account')}>
							<i class="fas fa-user-edit"></i>
							{m.updateProfile()}
						</a>
					{/if}

					<button
						class="btn btn-primary btn-lg"
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
				</div>
			</div>

			<div class="card bg-base-200 shadow-lg">
				<div class="card-body gap-4">
					<div class="prose prose-sm">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
						{@html m.postalRegistrationFAQ1()}
					</div>
					<div class="bg-base-100 flex gap-6 rounded-box p-4">
						<i class="fa-sharp-duotone fa-solid fa-mailbox-flag-up text-4xl"></i>
						<address class="text-lg not-italic">
							<strong>{conference.postalName}</strong><br /><span>{conference.postalStreet}</span
							><br />
							{#if conference.postalApartment}
								<span>{conference.postalApartment}</span><br />
							{/if}
							<span>{conference.postalZip} {conference.postalCity}</span><br />
							<span>{conference.postalCountry}</span>
						</address>
					</div>
					<div class="prose prose-sm">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
						{@html m.postalRegistrationFAQ2()}
					</div>
				</div>
			</div>
		</aside>
	</div>
</div>
