<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	// Unsubscribe links carry the address, so the field starts filled in.
	let email = $state(page.url.searchParams.get('email') ?? '');
	let unsubscribed = $state(false);

	const unsubscribe = async () => {
		if (!email) {
			toast.error(m.unsubscribeEmailMissing());
			return;
		}
		const promise = Promise.resolve(
			client.mutate.updateUsersNewsletterPreferences({
				__args: {
					email,
					wantsJoinTeamInformation: false,
					wantsToReceiveGeneralInformation: false
				}
			})
		);
		toast.promise(promise, {
			success: m.unsubscribeSuccess(),
			error: m.unsubscribeError(),
			loading: m.unsubscribeLoading()
		});
		await promise;
		unsubscribed = true;
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
				<a class="btn btn-primary" href={resolve('/my-account')}>{m.goToProfile()}</a>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100">
			<div class="card-body">
				<h1 class="text-xl">{m.unsubscribedAll()}</h1>
				<h3 class="mt-10 text-lg">{m.unsubscribeRegret()}</h3>
				<a class="btn btn-primary" href={resolve('/my-account')}>{m.goToProfile()}</a>
				<p class="max-w-lg text-xs">
					{m.unsubscribeNote()}
				</p>
			</div>
		</div>
	{/if}
</div>
