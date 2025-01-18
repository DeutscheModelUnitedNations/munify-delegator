<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let conferencePaymentDataQuery = $derived(data.PaymentLayoutQuery);
	let conferencePaymentData = $derived($conferencePaymentDataQuery.data?.findUniqueConference);
	let conferenceQueryData = $derived(data.conferenceQueryData);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.delegationPayment()}</h1>
	<p>{m.delegationPaymentDescription()}</p>

	<ReferenceMaker
		users={conferenceQueryData?.findUniqueDelegationMember?.delegation.members.map((member) => ({
			id: member.user.id,
			family_name: member.user.family_name,
			given_name: member.user.given_name
		})) ?? []}
		ownUserId={data.user.sub}
		{conferencePaymentData}
	/>
</div>
