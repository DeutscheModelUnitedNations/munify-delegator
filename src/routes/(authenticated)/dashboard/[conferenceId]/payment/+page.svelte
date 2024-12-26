<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.payment()}</h2>
	<p>{m.paymentDescription()}</p>

	<div class="flex w-full flex-col gap-4 md:flex-row"></div>
</div>
