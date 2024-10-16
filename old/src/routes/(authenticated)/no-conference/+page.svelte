<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import svgempty from '$assets/undraw/empty_street.svg';
	import * as m from '$lib/paraglide/messages.js';
</script>

<main class="h-screen w-full flex flex-col justify-center items-center gap-10 p-4">
	<img src={svgempty} alt="Empty" class="w-1/2" />
	<h1 class="text-3xl text-center">{m.noConferenceHeading()}</h1>
	<p>{m.noConferenceText()}</p>
	<div class="flex gap-4 flex-col md:flex-row-reverse">
		<a class="btn btn-primary" href="/registration">{m.signupNow()}</a>
		<a class="btn" href="/">{m.backToHome()}</a>
	</div>
</main>
<div class="w-full p-4">
	<Footer />
</div>
