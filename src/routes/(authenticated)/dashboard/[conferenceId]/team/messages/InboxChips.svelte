<!--
	@component
	The inboxes a team member answers, as chips that narrow the chat list to one of them, each with
	how much of it is unread.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { inboxName } from '#lib/components/chat/chatLabels';
	import type { TeamInbox } from './teamInboxes';

	interface Props {
		inboxes: readonly TeamInbox[];
		/** The key of the inbox the list is narrowed to; null for all */
		selected: string | null;
		unreadOf: (key: string) => number;
		onSelect: (key: string | null) => void;
	}

	let { inboxes, selected, unreadOf, onSelect }: Props = $props();
</script>

<div class="flex flex-wrap gap-1.5" role="group" aria-label={m.chatInboxes()}>
	<button
		type="button"
		class={['btn btn-xs', selected === null ? 'btn-primary' : 'btn-ghost']}
		aria-pressed={selected === null}
		onclick={() => onSelect(null)}
	>
		{m.all()}
	</button>
	{#each inboxes as inbox (inbox.key)}
		{@const unread = unreadOf(inbox.key)}
		<button
			type="button"
			class={['btn btn-xs', selected === inbox.key ? 'btn-primary' : 'btn-ghost']}
			aria-pressed={selected === inbox.key}
			onclick={() => onSelect(selected === inbox.key ? null : inbox.key)}
		>
			{inboxName(inbox)}
			{#if unread > 0}<span class="badge badge-xs badge-primary">{unread}</span>{/if}
		</button>
	{/each}
</div>
