<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let conferencePaymentData = $derived(data.conferencePaymentData);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.singlePayment()}</h1>
	<p>{m.singlePaymentDescription()}</p>

	<ReferenceMaker
		users={[
			{ id: data.user.sub, familyName: data.user.family_name, givenName: data.user.given_name }
		]}
		ownUserId={data.user.sub}
		{conferencePaymentData}
	/>
</div>
