<!--
	@component
	The dialog around `NewChatPicker`: "new message". The picker loads its people when the dialog
	opens, so the page does not carry everybody of the conference along.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import NewChatPicker from './NewChatPicker.svelte';

	interface Props {
		open: boolean;
		conferenceId: string;
		mode: 'participant' | 'team';
		delegationGroup?: boolean;
		onOpened: (chatId: string) => void;
	}

	let {
		open = $bindable(),
		conferenceId,
		mode,
		delegationGroup = false,
		onOpened
	}: Props = $props();
</script>

<Modal bind:open title={m.chatNewMessage()}>
	<svelte:boundary>
		<NewChatPicker
			{conferenceId}
			{mode}
			{delegationGroup}
			onOpened={(chatId) => {
				open = false;
				onOpened(chatId);
			}}
		/>
		{#snippet pending()}
			<div class="flex justify-center py-10">
				<span class="loading loading-spinner" aria-label={m.genericToastLoading()}></span>
			</div>
		{/snippet}
		{#snippet failed()}
			<p class="text-base-content/70 py-6 text-center">{m.chatNobodyToWrite()}</p>
		{/snippet}
	</svelte:boundary>
	{#snippet action()}
		<button class="btn btn-ghost" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>
