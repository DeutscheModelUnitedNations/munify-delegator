<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { client } from '$lib/api/rumbleClient/client';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/utils/pdfGenerator';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import formatNames, { formatInitials } from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = $derived(await getCurrentUser());

	const participation = $derived(await fetchMyParticipation(params.conferenceId));

	const conferenceData = $derived(participation);
	const conference = $derived(conferenceData?.conference);
	const userData = $derived(currentUser);
	const userId = $derived(userData.sub);

	function fetchDetails(id: string, conferenceId: string) {
		return Promise.all([
			client.query.user({
				__args: { id },
				id: true,
				givenName: true,
				familyName: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				birthday: true
			}),
			client.query.conference({
				__args: { id: conferenceId },
				id: true,
				contractContent: true,
				guardianConsentContent: true,
				mediaConsentContent: true,
				termsAndConditionsContent: true
			})
		]);
	}

	type Details = Awaited<ReturnType<typeof fetchDetails>>;

	let details = $state<Details>();
	let userQueryData = $derived(details?.[0]);
	let userDataNotComplete = $derived(
		!(
			userQueryData?.street &&
			userQueryData?.zip &&
			userQueryData?.city &&
			userQueryData?.country &&
			userQueryData?.birthday
		)
	);

	let loading = $state(false);

	$effect(() => {
		const conferenceId = conference?.id;
		if (!conferenceId) return;
		void fetchDetails(userId, conferenceId).then((result) => {
			details = result;
		});
	});

	async function handleGeneratePDF() {
		loading = true;
		try {
			const user = details?.[0];
			const conferenceConsents = details?.[1];

			if (user) {
				if (!user.street || !user.zip || !user.city || !user.country || !user.birthday) {
					toast.error(m.incompleteAddressOrBirthdayForPostalRegistration());
					loading = false;
					return;
				}

				const recipientData: RecipientData = {
					name: `${conference?.postalName}`,
					address: `${conference?.postalStreet} ${conference?.postalApartment ? conference?.postalApartment : ''}`,
					zip: conference?.postalZip?.toString() ?? '',
					city: conference?.postalCity ?? '',
					country: conference?.postalCountry ?? ''
				};

				const participantData: ParticipantData = {
					id: user.id,
					name: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
						givenNameFirst: true,
						familyNameUppercase: true,
						givenNameUppercase: true
					}),
					address: `${user.street} ${user.apartment ? user.apartment : ''}, ${user.zip} ${user.city}, ${user.country}`,
					birthday: user.birthday?.toLocaleDateString() ?? ''
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference?.startConference, user.birthday ?? new Date()),
					participantData,
					recipientData,
					conferenceConsents?.contractContent ?? undefined,
					conferenceConsents?.guardianConsentContent ?? undefined,
					conferenceConsents?.mediaConsentContent ?? undefined,
					conferenceConsents?.termsAndConditionsContent ?? undefined,
					`${formatInitials(user.givenName ?? undefined, user.familyName ?? undefined)}_postal_registration.pdf`
				);

				toast.success(m.postalRegistrationPDFGenerated());
			} else {
				console.error('User details not found');
				toast.error(m.errorGeneratingPostalRegistrationPDF());
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.errorGeneratingPostalRegistrationPDF());
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
		{@html m.postalRegistrationInstructions({
			conferenceStart: conference?.startConference
				? new Date(conference.startConference!).toLocaleDateString()
				: 'Date unknown'
		})}

		{#if details}
			{#if userDataNotComplete}
				<div class="alert alert-warning mt-4">
					<i class="fas fa-exclamation-triangle text-3xl"></i>
					<div class="flex flex-col gap-2 items-start">
						<div>{m.completeAddressAndBirthdayForPostalRegistration()}</div>
						<a
							class="btn no-underline"
							href={`/my-account?redirect=${encodeURIComponent(`${page.url.origin}/dashboard/${params.conferenceId}`)}`}
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
								{userQueryData?.givenName}
								{userQueryData?.familyName}
							</div>
							<i class="fa-duotone fa-home"></i>
							<div>
								{userQueryData?.street}
								{userQueryData?.apartment ? `, ${userQueryData.apartment}` : ''}<br />
								{userQueryData?.zip}
								{userQueryData?.city}<br />
								{userQueryData?.country}
							</div>
							<i class="fa-duotone fa-cake-candles"></i>
							<div>
								{userQueryData?.birthday
									? new Date(userQueryData.birthday).toLocaleDateString()
									: ''}
							</div>
						</div>
						<a class="btn no-underline" href="/my-account">
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
		{:else}
			<div class="mt-4">
				<i class="fas fa-spinner fa-spin text-3xl"></i>
			</div>
		{/if}

		{@html m.postalRegistrationFAQ1()}
		<div class="card bg-base-200 shadow-lg">
			<div class="card-body gap-10 sm:flex-row">
				<i class="fa-duotone fa-mailbox-flag-up text-5xl"></i>
				<address class="text-lg sm:text-xl">
					<strong>{conference?.postalName}</strong><br /><span>{conference?.postalStreet}</span><br
					/>
					{#if conference?.postalApartment}
						<span>{conference?.postalApartment}</span><br />
					{/if}
					<br />
					<span>{conference?.postalZip} {conference?.postalCity}</span><br />
					<span>{conference?.postalCountry}</span>
				</address>
			</div>
		</div>
		{@html m.postalRegistrationFAQ2()}
	</div>
</div>
