<script lang="ts">
	import { graphql } from '$houdini';
	import toast from 'svelte-french-toast';
	import Footer from '../Footer.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages';

	let { data }: PageProps = $props();

	let email = $state('');
	let loading = $state(false);
	let unsubscribed = $state(false);

	$effect(() => {
		if (data.prefillEmail) email = data.prefillEmail;
	});

	const unsubscribeAllMutation = graphql(`
		mutation UnsubscribeAllMutation($email: String!, $all: Boolean!) {
			updateOneUsersNewsletterPreferences(
				email: $email
				wantsJoinTeamInformation: $all
				wantsToReceiveGeneralInformation: $all
			) {
				id
			}
		}
	`);

	const unsubscribe = async () => {
		if (!email) {
			toast.error(m.unsubscribeEmailMissing());
			return;
		}
		loading = true;
		toast
			.promise(
				unsubscribeAllMutation.mutate({
					email,
					all: false
				}),
				{
					success: m.unsubscribeSuccess(),
					error: m.unsubscribeError(),
					loading: m.unsubscribeLoading()
				}
			)
			.then(() => {
				unsubscribed = true;
				loading = false;
			});
	};
</script>

<div
	class="bg-base-200 flex min-h-screen w-full flex-col items-center justify-center p-5 text-center sm:p-10"
>
	{#if !unsubscribed}
		<div class="card bg-base-100">
			<div class="card-body">
				<h1 class="text-3xl">{m.unsubscribeNewsletters()}</h1>
				<input class="input input-bordered mt-6 w-lg text-center" type="email" bind:value={email} />
				<button class="btn btn-error {email ? '' : 'btn-disabled'} mt-5" onclick={unsubscribe}
					>{m.unsubscribeAllNewslettersButton()}</button
				>
				<h3 class="mt-6 text-lg">{m.usubscribeSomeOnly()}</h3>
				<a class="btn btn-primary" href="/my-account">{m.goToProfile()}</a>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100">
			<div class="card-body">
				<h1 class="text-xl">{m.unsubscribedAll()}</h1>
				<h3 class="mt-10 text-lg">{m.unsubscribeRegret()}</h3>
				<a class="btn btn-primary" href="/my-account">{m.goToProfile()}</a>
				<p class="max-w-lg text-xs">
					{m.unsubscribeNote()}
				</p>
			</div>
		</div>
	{/if}
</div>
