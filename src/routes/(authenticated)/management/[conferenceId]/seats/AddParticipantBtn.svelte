<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import UserSearchModal from './UserSearchModal.svelte';
	import { type getUserInfo$result } from '$houdini';
	import type { Snippet } from 'svelte';

	interface Props {
		warning?: boolean;
		user: Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined;
		targetRole: string;
		addParticipant: () => Promise<void>;
		formElements?: Snippet[];
	}

	let {
		warning = false,
		user = $bindable(),
		targetRole,
		addParticipant,
		formElements
	}: Props = $props();

	let open = $state(false);
</script>

<div
	class="tooltip {warning ? 'tooltip-warning' : 'tooltip-success'}"
	data-tip={m.addParticipant()}
>
	<button
		aria-label={m.addParticipant()}
		class="btn btn-outline {warning ? 'btn-warning' : 'btn-success'} btn-sm w-10"
		onclick={() => (open = true)}
	>
		{#if warning}
			<i class="fas fa-diamond-exclamation"></i>
		{:else}
			<i class="fas fa-plus"></i>
		{/if}
	</button>
</div>

<UserSearchModal bind:open bind:user {targetRole} {addParticipant}>
	{#if formElements}
		{#each formElements as element}
			<div class="rounded-lg bg-base-200 p-4">
				{@render element()}
			</div>
		{/each}
	{/if}
</UserSearchModal>
