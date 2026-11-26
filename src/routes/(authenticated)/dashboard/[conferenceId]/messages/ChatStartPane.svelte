<!--
	@component
	What the messenger shows while no chat is open: whom a participant can write to right away (their
	delegation, the group of their committee or role, the team inboxes that are theirs) and the way
	to everybody else, with the reminder that others only see their role.
-->
<script lang="ts">
	import { fetchChatGroups, fetchChatInboxes } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from '#lib/components/chat/ChatAvatar.svelte';
	import { createChatOpener } from '#lib/components/chat/chatOpener.svelte.js';
	import {
		groupIcon,
		groupName,
		inboxDescription,
		inboxName,
		INBOX_ICON
	} from '#lib/components/chat/chatLabels';
	import { groupLabelSource } from '#lib/components/chat/chatGroups';

	interface Props {
		conferenceId: string;
		/** Whether the caller's delegation has a group to open */
		delegationGroup: boolean;
		onNew: () => void;
		onOpened: (chatId: string) => void;
	}

	let { conferenceId, delegationGroup, onNew, onOpened }: Props = $props();

	const [inboxes, groups] = $derived(
		await Promise.all([fetchChatInboxes({ conferenceId }), fetchChatGroups(conferenceId)])
	);
	const firstInbox = $derived((delegationGroup ? 1 : 0) + groups.length);
	// single trusted persons stay in the picker, a card each would crowd the pane
	const shownInboxes = $derived(inboxes.filter((option) => !option.trustedPersonId));

	const opener = createChatOpener({
		conferenceId: () => conferenceId,
		onOpened: (chatId) => onOpened(chatId)
	});
</script>

{#snippet card({
	avatar,
	title,
	detail,
	onclick,
	index
}: {
	avatar: { icon: string };
	title: string;
	detail: string;
	onclick: () => void;
	/** Its place among the cards, which come in one after another */
	index: number;
})}
	<li class="start-card" style:--index={index}>
		<button
			type="button"
			class="bg-base-200 hover:bg-primary/15 flex h-full w-full items-center gap-3 rounded-box p-3 text-left transition-colors"
			disabled={opener.opening}
			{onclick}
			data-testid="chat-start-option"
		>
			<ChatAvatar {avatar} />
			<span class="flex min-w-0 flex-col leading-tight">
				<span class="font-medium">{title}</span>
				<span class="text-base-content/60 text-xs">{detail}</span>
			</span>
		</button>
	</li>
{/snippet}

<div class="flex h-full overflow-y-auto p-6" data-testid="chat-start">
	<div class="m-auto flex w-full max-w-2xl flex-col gap-5">
		<div class="flex flex-col items-center gap-2 text-center">
			<i aria-hidden="true" class="ph-duotone ph-chats-circle text-primary text-5xl"></i>
			<h2 class="text-xl font-semibold">{m.chatStartTitle()}</h2>
		</div>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#if delegationGroup}
				{@render card({
					avatar: { icon: 'users-three' },
					title: m.chatMyDelegation(),
					detail: m.chatDelegationHint(),
					onclick: opener.delegation,
					index: 0
				})}
			{/if}
			{#each groups as group, index (`${group.committeeId}/${group.roleId}`)}
				{@const source = groupLabelSource(group)}
				{@render card({
					avatar: { icon: groupIcon(source) },
					title: groupName(source),
					detail: group.kind === 'ROLE' ? m.chatRoleGroupHint() : m.chatCommitteeGroupHint(),
					onclick: () => opener.group(group),
					index: index + 1
				})}
			{/each}
			{#each shownInboxes as option, index (`${option.inbox}/${option.committeeId}/${option.roleId}`)}
				{@render card({
					avatar: { icon: INBOX_ICON[option.inbox] },
					title: inboxName(option),
					detail: inboxDescription(option),
					onclick: () => opener.inbox({ option }),
					index: firstInbox + index
				})}
			{/each}
			{@render card({
				avatar: { icon: 'magnifying-glass' },
				title: m.chatNewMessage(),
				detail: m.chatStartSearchHint(),
				onclick: onNew,
				index: firstInbox + shownInboxes.length
			})}
		</ul>

		<p class="text-base-content/60 flex items-start justify-center gap-2 text-center text-sm">
			<i aria-hidden="true" class="ph-duotone ph-identification-badge mt-0.5"></i>
			{m.chatRoleNotName()}
		</p>
	</div>
</div>

<style>
	@keyframes start-card-in {
		from {
			opacity: 0;
			translate: 0 8px;
		}
	}

	.start-card {
		animation: 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both start-card-in;
		animation-delay: calc(var(--index) * 40ms);
	}

	@media (prefers-reduced-motion: reduce) {
		.start-card {
			animation: none;
		}
	}
</style>
