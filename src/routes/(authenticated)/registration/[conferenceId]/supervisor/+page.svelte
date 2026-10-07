<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';

	let { params }: PageProps = $props();

	let plansOwnAttendenceAtConference = $state(true);

	const signup = async () => {
		const promise = client.mutate.createConferenceSupervisor({
			__args: { conferenceId: params.conferenceId, plansOwnAttendenceAtConference },
			id: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		goto(resolve(`/dashboard/${params.conferenceId}`));
	};
</script>

<RegistrationStepPage
	conferenceId={params.conferenceId}
	title={m.signupForSupervisors()}
	description={m.signupForSupervisorsDescription()}
>
	<div class="card bg-base-100 border-base-200 w-full max-w-md border shadow-lg">
		<div class="card-body items-center justify-center">
			<label class="label cursor-pointer">
				<span class="mr-4">{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={plansOwnAttendenceAtConference}
					onchange={() => (plansOwnAttendenceAtConference = !plansOwnAttendenceAtConference)}
				/>
			</label>
			<i class="fa-duotone fa-arrow-down"></i>
			<p class="text-center text-sm italic">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
				{@html plansOwnAttendenceAtConference
					? m.willBePresentAtConference()
					: m.willNotBePresentAtConference()}
			</p>
			<button class="btn btn-primary mt-10 w-full" onclick={() => signup()}>
				{m.signupNow()}
				<i class="fas fa-paper-plane"></i>
			</button>
		</div>
	</div>
</RegistrationStepPage>
