<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let conferencePaymentDataQuery = $derived(data.PaymentLayoutQuery);
	let conferencePaymentData = $derived($conferencePaymentDataQuery.data?.findUniqueConference);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.groupPayment()}</h1>
	<p>{m.groupPaymentDescription()}</p>
  <div class="alert alert-error">
    <i class="fas fa-traffic-cone text-3xl"></i>
    {m.groupPaymentNotYetImplemented()}
  </div>
</div>
