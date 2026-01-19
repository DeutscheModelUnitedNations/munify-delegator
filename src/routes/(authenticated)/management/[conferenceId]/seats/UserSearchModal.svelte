<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql, type getUserInfo$result } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import type { Snippet } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';

	interface Props {
		open: boolean;
		user: Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined;
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
			previewUserByIdOrEmail(emailOrId: $emailOrId) {
				id
				given_name
				family_name
				email
			}
		}
	`);

	const params = queryParameters({
		assignUserId: true
	});

	let search = $state($params.assignUserId ?? '');
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
					user = result.data?.previewUserByIdOrEmail;
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

	$effect(() => {
		if (open) {
			// autofocus the input field
			const input = document.getElementById('emailOrId') as HTMLInputElement;
			if (input) {
				input.focus();
			}
		}
	});
</script>

{#snippet action()}
	<button class="btn btn-error" onclick={() => (open = false)}>{m.close()}</button>
	<button
		class="btn btn-success {!user && 'btn-disabled'}"
		onclick={async () => {
			await addParticipant();
			open = false;
			user = undefined;
			cache.markStale();
			await invalidateAll();
			if ($params.assignUserId) {
				$params.assignUserId = null;
			}
		}}>{m.addUser()}</button
	>
{/snippet}

<Modal bind:open {action} title={m.addParticipant()}>
	<div class="flex w-full flex-col items-center gap-4">
		<input
			type="text"
			id="emailOrId"
			bind:value={search}
			placeholder={m.emailOrId()}
			class="input w-full"
		/>

		<div class="flex w-full flex-col gap-4">
			<div
				class="bg-base-200 flex w-full flex-col items-center justify-center gap-1 rounded-lg p-4"
			>
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
	</div>
</Modal>
