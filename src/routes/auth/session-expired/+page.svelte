<script lang="ts">
	import questionSvg from '$assets/undraw/question.svg';
	import { m } from '$lib/paraglide/messages';
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-8 p-4 py-12">
	<img src={questionSvg} alt="Session Expired" class="w-1/3 max-w-[180px]" />

	<h1 class="text-center text-3xl font-bold">{m.sessionExpiredTitle()}</h1>

	<p class="text-center text-base-content/80">
		{m.sessionExpiredDescription()}
	</p>

	<div class="rounded-box bg-base-200 p-4">
		<h2 class="mb-2 font-semibold">{m.sessionExpiredCauses()}</h2>
		<ul class="list-inside list-disc space-y-1 text-base-content/70">
			<li>{m.sessionExpiredCause1()}</li>
			<li>{m.sessionExpiredCause2()}</li>
			<li>{m.sessionExpiredCause3()}</li>
		</ul>
	</div>

	<div class="flex flex-col gap-3 sm:flex-row">
		<a class="btn btn-primary" href="/">
			<i class="fa-duotone fa-arrow-right"></i>
			{m.sessionExpiredTryAgain()}
		</a>
		<a class="btn btn-ghost" href="/">
			{m.backToHome()}
		</a>
	</div>
</main>
