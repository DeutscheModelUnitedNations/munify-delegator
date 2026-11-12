<!--
	@component
	The team inboxes to choose one from: for a team member answering several that reach a person.
-->
<script lang="ts">
	import type { ChatInboxRow } from '#lib/api/chats';
	import ChatAvatar from './ChatAvatar.svelte';
	import { inboxName, INBOX_ICON } from './chatLabels';

	interface Props {
		options: readonly ChatInboxRow[];
		disabled?: boolean;
		onChoose: (option: ChatInboxRow) => void;
	}

	let { options, disabled = false, onChoose }: Props = $props();
</script>

<ul class="flex flex-col gap-1">
	{#each options as option (`${option.inbox}/${option.committeeId}`)}
		<li>
			<button
				type="button"
				class="hover:bg-base-200 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left"
				{disabled}
				onclick={() => onChoose(option)}
				data-testid="inbox-choice"
			>
				<ChatAvatar avatar={{ icon: INBOX_ICON[option.inbox] }} size="sm" />
				<span class="font-medium">{inboxName(option)}</span>
			</button>
		</li>
	{/each}
</ul>
