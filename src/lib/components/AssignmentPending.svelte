<script lang="ts">
	import progress from '$assets/undraw/progress.svg';
	import { m } from '$lib/paraglide/messages';

	/**
	 * What participants see once registration has closed but the team has not released the
	 * assignment yet: neither accepted nor rejected, just not decided in their view.
	 */
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-10 p-4">
	<img src={progress} alt="" class="w-1/2" />
	<h1 class="text-center text-3xl">{m.assignmentPending()}</h1>
	<p class="text-center">{m.assignmentPendingText()}</p>
</main>
