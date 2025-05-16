<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let conferencePaymentDataQuery = $derived(data.PaymentLayoutQuery);
	let conferencePaymentData = $derived($conferencePaymentDataQuery.data?.findUniqueConference);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.singlePayment()}</h1>
	<p>{m.singlePaymentDescription()}</p>

	<ReferenceMaker
		users={[
			{ id: data.user.sub, family_name: data.user.family_name, given_name: data.user.given_name }
		]}
		ownUserId={data.user.sub}
		{conferencePaymentData}
	/>
</div>
