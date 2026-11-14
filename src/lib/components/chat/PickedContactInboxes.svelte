<!--
	@component
	The second step of the picker for a team member who answers several inboxes reaching the person
	they picked: which inbox to write from, with a way back to the people.
-->
<script lang="ts">
	import type { ChatContactRow, ChatInboxRow } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from './ChatAvatar.svelte';
	import InboxChoices from './InboxChoices.svelte';
	import { contactAvatar, contactDetail, contactName } from './chatLabels';

	interface Props {
		contact: ChatContactRow;
		inboxes: ChatInboxRow[];
		disabled: boolean;
		onBack: () => void;
		onChoose: (option: ChatInboxRow) => void;
	}

	let { contact, inboxes, disabled, onBack, onChoose }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<button type="button" class="btn btn-ghost btn-sm gap-2 self-start" onclick={onBack}>
		<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
		{m.chatPickAnotherPerson()}
	</button>
	<div class="flex items-center gap-3">
		<ChatAvatar avatar={contactAvatar(contact)} />
		<div class="flex flex-col">
			<span class="font-semibold">{contactName(contact)}</span>
			<span class="text-base-content/60 text-sm">{contactDetail(contact)}</span>
		</div>
	</div>
	<p class="text-base-content/70 text-sm">{m.chatChooseInbox()}</p>
	<InboxChoices options={inboxes} {disabled} {onChoose} />
</div>
