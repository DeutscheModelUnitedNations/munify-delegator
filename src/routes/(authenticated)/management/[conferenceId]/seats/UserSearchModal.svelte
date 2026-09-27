<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import type { Snippet } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';

	interface Props {
		open: boolean;
		user: Partial<UserPreview> | undefined;
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

	const params = queryParameters({
		assignUserId: true
	});

	let search = $state($params.assignUserId ?? '');
	let loading = $state(false);

	$effect(() => {
		if (search && search.length > 2) {
			loading = true;
			client.query
				.previewUserByIdOrEmail({
					__args: { emailOrId: search },
					id: true,
					given_name: true,
					family_name: true,
					email: true
				})
				.then((result) => {
					user = result;
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
						{formatNames(user.given_name ?? undefined, user.family_name ?? undefined)} ({user.email})
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
