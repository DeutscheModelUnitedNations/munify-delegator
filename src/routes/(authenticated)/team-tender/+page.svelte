<script lang="ts">
	import { graphql } from '$houdini';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let signedUp = $state(data.wantsJoinTeamInformation);
	let loading = $state(false);

	const updatePreferenceMutation = graphql(`
		mutation UpdateTeamTenderPreference($email: String!, $wantsJoinTeamInformation: Boolean!) {
			updateOneUsersNewsletterPreferences(
				email: $email
				wantsJoinTeamInformation: $wantsJoinTeamInformation
			) {
				id
			}
		}
	`);

	const toggleSignUp = async (value: boolean) => {
		loading = true;
		const promise = updatePreferenceMutation.mutate({
			email: data.user.email,
			wantsJoinTeamInformation: value
		});
		toast.promise(promise, {
			success: value ? m.teamTenderSignUpSuccess() : m.teamTenderUnsubscribeSuccess(),
			error: m.teamTenderError(),
			loading: m.teamTenderLoading()
		});
		try {
			await promise;
			signedUp = value;
		} finally {
			loading = false;
		}
	};
</script>

<div class="flex min-h-[80vh] w-full flex-col items-center justify-center p-5 text-center sm:p-10">
	<div class="card bg-base-100 max-w-lg">
		<div class="card-body items-center">
			<i class="fa-duotone fa-bullhorn text-primary mb-4 text-5xl"></i>
			<h1 class="text-3xl font-bold">{m.teamTenderTitle()}</h1>

			{#if signedUp}
				<div class="alert alert-success mt-6">
					<i class="fa-solid fa-circle-check text-xl"></i>
					<div>
						<h3 class="font-bold">{m.teamTenderAlreadySignedUp()}</h3>
						<p class="text-sm">{m.teamTenderAlreadySignedUpDescription()}</p>
					</div>
				</div>
				<button
					class="btn btn-outline btn-error mt-4"
					disabled={loading}
					onclick={() => toggleSignUp(false)}
				>
					{m.teamTenderUnsubscribe()}
				</button>
			{:else}
				<p class="mt-4 max-w-md text-base">{m.teamTenderDescription()}</p>
				<button class="btn btn-primary mt-6" disabled={loading} onclick={() => toggleSignUp(true)}>
					<i class="fa-solid fa-paper-plane"></i>
					{m.teamTenderSignUp()}
				</button>
			{/if}

			<div class="divider"></div>
			<a class="link link-hover text-sm" href="/my-account">
				{m.teamTenderManagePreferences()}
			</a>
		</div>
	</div>
</div>
