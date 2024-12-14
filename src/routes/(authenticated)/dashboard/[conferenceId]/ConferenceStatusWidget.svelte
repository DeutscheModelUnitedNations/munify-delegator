<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.personalStatus()}</h2>
	<div class="alert">
		<i class="fa-duotone fa-traffic-cone mx-4 text-3xl"></i>
		<div class="flex flex-col">
			<!-- TODO -->
			<h3 class="text-xl font-bold">{m.personalStatusUnderDevelopment()}</h3>
			<p>{m.personalStatusUnderDevelopmentDescription()}</p>
		</div>
	</div>
</section>
