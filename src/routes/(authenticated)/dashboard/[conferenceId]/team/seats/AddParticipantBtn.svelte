<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import UserSearchModal from './UserSearchModal.svelte';
	import type { UserPreview } from './userPreview';
	import type { Snippet } from 'svelte';
	import { getAssignUser } from './assignUser.svelte';

	interface Props {
		warning?: boolean;
		user: Partial<UserPreview> | undefined;
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

	const assignUser = getAssignUser();
</script>

<div
	class="tooltip {warning ? 'tooltip-warning' : 'tooltip-success'}"
	data-tip={m.addParticipant()}
>
	<button
		aria-label={m.addParticipant()}
		class="btn {assignUser.userId ? '' : 'btn-outline'} {warning
			? 'btn-warning'
			: 'btn-success'} btn-sm w-10"
		onclick={() => (open = true)}
	>
		{#if warning}
			<i aria-hidden="true" class="ph-fill ph-warning-diamond"></i>
		{:else}
			<i aria-hidden="true" class="ph-fill ph-plus {assignUser.userId ? 'icon-beat' : ''}"></i>
		{/if}
	</button>
</div>

<UserSearchModal bind:open bind:user {targetRole} {addParticipant}>
	{#if formElements}
		{#each formElements as element, index (index)}
			<div class="bg-base-200 rounded-box p-4">
				{@render element()}
			</div>
		{/each}
	{/if}
</UserSearchModal>
