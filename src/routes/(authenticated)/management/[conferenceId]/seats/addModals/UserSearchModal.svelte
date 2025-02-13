<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql, type getUserInfo$result } from '$houdini';
	import * as m from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		user: Partial<getUserInfo$result['findUniqueUser']> | undefined;
		targetRole: string;
		addParticipant: () => Promise<void>;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		user = $bindable(),
		targetRole,
		addParticipant,
		children
	}: Props = $props();

	const getUserInfo = graphql(`
		query getUserInfo($emailOrId: String!) {
			findUniqueUser(where: { email: $emailOrId }) {
				id
				given_name
				family_name
				email
			}
		}
	`);

	let search = $state('');
	let loading = $state(false);

	$effect(() => {
		if (search && search.length > 2) {
			loading = true;
			getUserInfo
				.fetch({
					variables: {
						emailOrId: search
					}
				})
				.then((result) => {
					user = result.data?.findUniqueUser;
				})
				.finally(() => {
					loading = false;
				})
				.catch((error) => {
					console.error(error);
					loading = false;
				});
		}
	});
</script>

<div class="modal {open && 'modal-open'}">
	<button class="modal-backdrop" aria-label="Close modal" onclick={() => (open = false)}></button>
	<div class="modal-box gap-4">
		<div class="flex flex-col items-center gap-8">
			<input
				type="text"
				bind:value={search}
				placeholder={m.email()}
				class="input input-bordered w-full"
			/>

			<div class="flex flex-col gap-4">
				<div class="flex w-full flex-col items-center justify-center gap-1">
					{#if loading}
						<div>
							<i class="fa-duotone fa-spinner fa-spin"></i>
						</div>
					{:else if user}
						<div class="badge badge-success">
							{formatNames(user.given_name, user.family_name)} ({user.email})
						</div>
					{:else}
						<div class="badge badge-error">{m.userNotFound()}</div>
					{/if}
					<i class="fa-duotone fa-arrow-down"></i>
					<div class="badge badge-primary">{targetRole}</div>
				</div>
				{#if children && user}
					<div class="flex w-full flex-col gap-2">
						{@render children()}
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn btn-error" onclick={() => (open = false)}>{m.close()}</button>
				<button
					class="btn btn-success {!user && 'btn-disabled'}"
					onclick={async () => {
						await addParticipant();
						open = false;
						user = undefined;
						cache.markStale();
						invalidateAll();
					}}>{m.addUser()}</button
				>
			</div>
		</div>
	</div>
</div>
