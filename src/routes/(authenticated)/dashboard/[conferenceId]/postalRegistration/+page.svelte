<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';
	import { graphql } from '$houdini';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { testGuardian, testContract, testMedia, testTerms } from '$lib/services/testdata';

	let { data }: { data: PageData } = $props();

	const conferenceData = $derived(data.conferenceQueryData);
	const conference = $derived(conferenceData?.findUniqueConference);
	const userData = $derived(data.user);
	const userId = $derived(userData.sub);

	const userQuery = graphql(`
		query GetUserDetails($id: String!) {
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
		}
	`);

	let loading = $state(false);

	async function handleGeneratePDF() {
		loading = true;
		try {
			const userDetailsStore = await userQuery.fetch({ variables: { id: userId } });
			const user = userDetailsStore?.data?.findUniqueUser;

			if (user) {
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
					testContract,
					testGuardian,
					testMedia,
					testTerms,
					`${formatInitials(user.given_name, user.family_name)}_postal_registration.pdf`
				);
			} else {
				console.error('User details not found');
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
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
				: 'Datum unbekannt'
		})}
		<button class="btn btn-primary mt-4" onclick={handleGeneratePDF} disabled={loading}>
			{#if loading}
				<i class="fas fa-spinner fa-spin"></i>
				Dokumente werden generiert...
			{:else}
				<i class="fas fa-download"></i>
				Dokumente herunterladen
			{/if}
		</button>
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
