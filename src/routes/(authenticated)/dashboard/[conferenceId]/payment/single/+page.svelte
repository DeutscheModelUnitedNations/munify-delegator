<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchConferencePaymentData } from '../conferencePaymentData';
	import { page } from '$app/state';
	import ReferenceMaker from '../ReferenceMaker.svelte';

	const currentUser = $derived(await getCurrentUser());
	let conferencePaymentData = $derived(await fetchConferencePaymentData(page.params.conferenceId!));
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.singlePayment()}</h1>
	<p>{m.singlePaymentDescription()}</p>

	<ReferenceMaker
		users={[
			{
				id: currentUser.sub,
				familyName: currentUser.family_name,
				givenName: currentUser.given_name
			}
		]}
		ownUserId={currentUser.sub}
		{conferencePaymentData}
	/>
</div>
