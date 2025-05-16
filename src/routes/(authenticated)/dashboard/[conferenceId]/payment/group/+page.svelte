<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.groupPayment()}</h1>
	<p>{m.groupPaymentDescription()}</p>
	<div class="alert alert-error">
		<i class="fas fa-traffic-cone text-3xl"></i>
		{m.groupPaymentNotYetImplemented()}
	</div>
</div>
