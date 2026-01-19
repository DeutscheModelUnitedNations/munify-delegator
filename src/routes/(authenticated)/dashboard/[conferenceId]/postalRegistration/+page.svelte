<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import { cache, graphql } from '$houdini';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	const conferenceData = $derived(data.conferenceQueryData);
	const conference = $derived(conferenceData?.findUniqueConference);
	const userData = $derived(data.user);
	const userId = $derived(userData.sub);

	const userQuery = graphql(`
		query GetUserDetails($id: String!, $conferenceId: String!) {
			findUniqueUser(where: { id: $id }) {
				id
				given_name
				family_name
				street
				apartment
				zip
				city
				country
				birthday
			}

			findUniqueConference(where: { id: $conferenceId }) {
				id
				contractContent
				guardianConsentContent
				mediaConsentContent
				termsAndConditionsContent
			}
		}
	`);

	let userQueryData = $derived($userQuery.data?.findUniqueUser);
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
		userQuery.fetch({
			variables: { id: userId, conferenceId: conference!.id }
		});
	});

	async function handleGeneratePDF() {
		loading = true;
		try {
			cache.markStale();
			await invalidateAll();

			const user = $userQuery?.data?.findUniqueUser;
			const conferenceData = $userQuery?.data?.findUniqueConference;

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
					name: formatNames(user.given_name, user.family_name, {
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
					conferenceData?.contractContent ?? undefined,
					conferenceData?.guardianConsentContent ?? undefined,
					conferenceData?.mediaConsentContent ?? undefined,
					conferenceData?.termsAndConditionsContent ?? undefined,
					`${formatInitials(user.given_name, user.family_name)}_postal_registration.pdf`
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

		{#if $userQuery.data}
			{#if userDataNotComplete}
				<div class="alert alert-warning mt-4">
					<i class="fas fa-exclamation-triangle text-3xl"></i>
					<div class="flex flex-col gap-2 items-start">
						<div>{m.completeAddressAndBirthdayForPostalRegistration()}</div>
						<a
							class="btn no-underline"
							href={`/my-account?redirect=${encodeURIComponent(`${page.url.origin}/dashboard/${page.params.conferenceId}`)}`}
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
								{userQueryData?.given_name}
								{userQueryData?.family_name}
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
