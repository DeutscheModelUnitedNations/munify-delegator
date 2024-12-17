<script lang="ts">
	import svgempty from '$assets/undraw/empty_street.svg';
	import * as m from '$lib/paraglide/messages.js';
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-10 p-4">
	<img src={svgempty} alt="Empty" class="w-1/2" />
	<h1 class="text-center text-3xl">{m.noConferenceHeading()}</h1>
	<p>{m.noConferenceText()}</p>
	<div class="flex flex-col gap-4 md:flex-row-reverse">
		<a class="btn btn-primary" href="/registration">{m.signupNow()}</a>
		<a class="btn" href="/">{m.backToHome()}</a>
	</div>
</main>
