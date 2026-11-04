<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { acceptsSupervisorSignups } from '#lib/helpers/applicationReadiness';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';
	import SupervisorSteps from '../apply/SupervisorSteps.svelte';

	// Its own page as well as a path of the dashboard's form: a supervisor may sign up after
	// registration has closed, when the dashboard does not show the conference to them yet, until
	// the conference is over (`acceptsSupervisorSignups`, which the API applies as well).
	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	// Only readable while it is public or the caller has a part in it. When it is not, the form
	// stays: the conference may well still take supervisors, and the mutation says so if not.
	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, state: true })
	);
	const signupOpen = $derived(!conference || acceptsSupervisorSignups({ conference }));
</script>

<RegistrationStepPage
	{conferenceId}
	icon="chalkboard-user"
	title={m.signupForSupervisors()}
	description={m.signupForSupervisorsDescription()}
	bare
>
	{#if signupOpen}
		<ol class="flex flex-col">
			<SupervisorSteps {conferenceId} firstNumber={1} />
		</ol>
	{:else}
		<div role="status" class="alert bg-warning/10 border-warning/30">
			<i class="fa-sharp-duotone fa-solid fa-calendar-xmark text-warning text-xl"></i>
			<div>
				<h2 class="font-semibold">{m.supervisorSignupClosedTitle()}</h2>
				<p class="text-sm">{m.supervisorSignupClosedText()}</p>
			</div>
		</div>
	{/if}
</RegistrationStepPage>
