<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { graphql } from '$houdini';
	import { toast } from 'svelte-sonner';

	const createSupervisorMutation = graphql(`
		mutation CreateConferenceSupervisorMutation(
			$conferenceId: ID!
			$plansOwnAttendenceAtConference: Boolean!
		) {
			createOneConferenceSupervisor(
				conferenceId: $conferenceId
				plansOwnAttendenceAtConference: $plansOwnAttendenceAtConference
			) {
				id
			}
		}
	`);

	let { data }: { data: PageData } = $props();

	let plansOwnAttendenceAtConference = $state(true);

	const signup = () => {
		toast
			.promise(
				createSupervisorMutation.mutate({
					conferenceId: data.conferenceId,
					plansOwnAttendenceAtConference
				}),
				{
					loading: m.genericToastLoading(),
					success: m.genericToastSuccess(),
					error: m.genericToastError()
				}
			)
			.then(() => {
				goto(`/dashboard/${data.conferenceId}`);
			});
	};
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<main class="flex h-full w-full flex-1 flex-col items-center py-16 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{m.signupForSupervisors()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="max-ch-sm mb-10">
					{m.signupForSupervisorsDescription()}
				</p>

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

				<a class="btn btn-warning mt-16" href=".">{m.back()}</a>
			</div>
		</div>
	</main>
</div>
