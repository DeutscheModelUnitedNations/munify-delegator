<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import type { RegistrationStatus } from '$lib/utils/registrationStatus';
	import type { WaitingListStatus } from '$lib/helpers/waitingListStatus';

	interface Props {
		conferenceId: string;
		registrationStatus: RegistrationStatus;
		waitingListStatus: WaitingListStatus;
	}

	let { conferenceId, registrationStatus, waitingListStatus }: Props = $props();
</script>

<div class="mt-auto flex flex-wrap gap-3">
	{#if registrationStatus === 'OPEN'}
		<a
			href={resolve('/(authenticated)/registration/[conferenceId]', { conferenceId })}
			class="btn btn-primary btn-lg"
		>
			{m.signup()}
			<i class="fa-solid fa-arrow-right"></i>
		</a>
	{:else if registrationStatus === 'WAITING_LIST'}
		<a
			href={resolve('/(authenticated)/registration/[conferenceId]/waiting-list', { conferenceId })}
			class="btn btn-primary btn-lg"
		>
			{waitingListStatus === 'VACANCIES' ? m.vacanciesBtn() : m.waitingListBtn()}
			<i class="fa-solid fa-arrow-right"></i>
		</a>
	{:else}
		<button class="btn btn-lg" disabled>
			<i class="fa-duotone fa-lock"></i>
			{m.signup()}
		</button>
	{/if}
	<a
		href={resolve('/seats/[conferenceId]', { conferenceId })}
		target="_blank"
		class="btn btn-outline btn-lg"
	>
		{m.conferenceSeats()}
		<i class="fa-duotone fa-arrow-up-right-from-square"></i>
	</a>
</div>
