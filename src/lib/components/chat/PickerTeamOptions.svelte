<!--
	@component
	The picker's first group, for participants: their delegation's group, the group of their
	committee or role, and the team inboxes that are theirs. Renders nothing when the search leaves
	none of them.
-->
<script lang="ts">
	import type { ChatGroupRow, ChatInboxRow } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import PickerOption from './PickerOption.svelte';
	import { groupIcon, groupName, inboxDescription, inboxName, INBOX_ICON } from './chatLabels';
	import { groupLabelSource } from './chatGroups';

	interface Props {
		inboxes: readonly ChatInboxRow[];
		/** The groups of the caller's committee or role */
		groups?: readonly ChatGroupRow[];
		/** Whether the delegation's group is offered */
		delegation: boolean;
		disabled: boolean;
		onInbox: (option: ChatInboxRow) => void;
		onDelegation: () => void;
		onGroup?: (group: ChatGroupRow) => void;
	}

	let {
		inboxes,
		groups = [],
		delegation,
		disabled,
		onInbox,
		onDelegation,
		onGroup
	}: Props = $props();
</script>

{#if inboxes.length > 0 || groups.length > 0 || delegation}
	<section>
		<h3
			class="bg-base-100 text-base-content/60 sticky top-0 z-10 px-1 py-1.5 text-xs font-semibold tracking-wide uppercase"
		>
			{m.chatGroupTeamAndDelegation()}
		</h3>
		<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
			{#if delegation}
				<li>
					<PickerOption
						avatar={{ icon: 'users-three' }}
						title={m.chatMyDelegation()}
						detail={m.chatDelegationHint()}
						{disabled}
						onclick={onDelegation}
					/>
				</li>
			{/if}
			{#each groups as group (`${group.committeeId}/${group.roleId}`)}
				{@const source = groupLabelSource(group)}
				<li>
					<PickerOption
						avatar={{ icon: groupIcon(source) }}
						title={groupName(source)}
						detail={group.kind === 'ROLE' ? m.chatRoleGroupHint() : m.chatCommitteeGroupHint()}
						{disabled}
						onclick={() => onGroup?.(group)}
						testId="chat-group-option"
					/>
				</li>
			{/each}
			{#each inboxes as option (`${option.inbox}/${option.committeeId}/${option.roleId}/${option.trustedPersonId}`)}
				<li>
					<PickerOption
						avatar={{ icon: INBOX_ICON[option.inbox] }}
						title={inboxName(option)}
						detail={inboxDescription(option)}
						{disabled}
						onclick={() => onInbox(option)}
						testId="chat-inbox-option"
					/>
				</li>
			{/each}
		</ul>
	</section>
{/if}
