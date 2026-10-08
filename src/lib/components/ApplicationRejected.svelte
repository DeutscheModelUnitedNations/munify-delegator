<script lang="ts">
	import { resolve } from '$app/paths';
	import cancel from '$assets/undraw/cancel.svg';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceIdForWaitingListLink?: string;
	}

	let { conferenceIdForWaitingListLink }: Props = $props();
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-10 p-4">
	<img src={cancel} alt="Empty" class="w-1/2" />
	<h1 class="text-center text-3xl">{m.applicationRejected()}</h1>
	<p class="text-center">{m.applicationRejectedText()}</p>

	{#if conferenceIdForWaitingListLink}
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid user-clock text-2xl"></i>
			<div class="flex flex-col gap-2">
				<h2 class="text-2xl font-bold">{m.joinWaitingList()}</h2>
				<p>{m.joinWaitingListText()}</p>
				<a
					href={resolve('/(authenticated)/registration/[conferenceId]/waiting-list', {
						conferenceId: conferenceIdForWaitingListLink
					})}
					class="btn">{m.joinWaitingListBtn()}<i class="fas fa-arrow-right"></i></a
				>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-4 md:flex-row-reverse">
		<a class="btn" href={resolve('/')}>{m.backToHome()}</a>
	</div>
</main>
