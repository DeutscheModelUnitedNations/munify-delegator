<script lang="ts">
	import cancel from '$assets/undraw/cancel.svg';
	import * as m from '$lib/paraglide/messages.js';
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-10 p-4">
	<img src={cancel} alt="Empty" class="w-1/2" />
	<h1 class="text-center text-3xl">{m.applicationRejected()}</h1>
	<p class="text-center">{m.applicationRejectedText()}</p>
	<div class="flex flex-col gap-4 md:flex-row-reverse">
		<a class="btn" href="/">{m.backToHome()}</a>
	</div>
</main>
