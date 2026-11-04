<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';
	import SupervisorSteps from '../apply/SupervisorSteps.svelte';

	// Its own page as well as a path of the dashboard's form: a supervisor may sign up after
	// registration has closed, when the dashboard does not show the conference to them yet, until
	// the conference is over.
	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	// Asked of the API rather than read off the conference, which someone without a part in it
	// cannot read once registration is over; the mutation applies the same rule.
	const signupOpen = $derived(
		await client.query.supervisorSignupOpen({ __args: { conferenceId } })
	);
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
