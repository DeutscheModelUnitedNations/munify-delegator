<script lang="ts">
	import { resolve } from '$app/paths';
	import undrawNew from '#assets/undraw/new.svg';
	import { m } from '#lib/paraglide/messages.js';
	import type { RegistrationStatus } from '#lib/utils/registrationStatus.js';

	/** For someone signed in without a part in a conference whose registration is not open. */
	interface Props {
		conferenceId: string;
		status: Exclude<RegistrationStatus, 'OPEN'>;
	}

	let { conferenceId, status }: Props = $props();

	const text = $derived(
		{
			WAITING_LIST: m.notParticipatingWaitingList,
			NOT_YET_OPEN: m.notParticipatingRegistrationNotYetOpen,
			CLOSED: m.notParticipatingRegistrationClosed,
			UNKNOWN: m.notParticipatingRegistrationClosed
		}[status]()
	);
</script>

<div
	class="rounded-box border-primary/30 bg-primary/5 flex flex-col items-center gap-6 border-2 p-6 shadow-sm sm:flex-row"
>
	<img src={undrawNew} alt="" class="w-40 shrink-0 sm:w-52" />
	<div class="flex flex-1 flex-col items-center gap-4 text-center sm:items-start sm:text-left">
		<h2 class="text-2xl font-bold tracking-tight">{m.notParticipatingTitle()}</h2>
		<p class="text-base-content/70 max-w-xl">{text}</p>

		{#if status === 'WAITING_LIST'}
			<a class="btn btn-primary gap-2" href={resolve(`registration/${conferenceId}/waiting-list`)}>
				<i class="fa-sharp-duotone fa-solid fa-hourglass-half"></i>
				{m.joinWaitingListBtn()}
			</a>
		{/if}
	</div>
</div>
