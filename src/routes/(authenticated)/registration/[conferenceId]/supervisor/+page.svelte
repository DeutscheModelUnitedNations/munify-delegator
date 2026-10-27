<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';
	import SupervisorSteps from '../apply/SupervisorSteps.svelte';

	// Its own page as well as a path of the dashboard's form: a supervisor may sign up after
	// registration has closed, when the dashboard does not show the conference to them yet.
	let { params }: PageProps = $props();
</script>

<RegistrationStepPage
	conferenceId={params.conferenceId}
	icon="chalkboard-user"
	title={m.signupForSupervisors()}
	description={m.signupForSupervisorsDescription()}
	bare
>
	<ol class="flex flex-col">
		<SupervisorSteps conferenceId={params.conferenceId} firstNumber={1} />
	</ol>
</RegistrationStepPage>
