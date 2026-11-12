<!--
	@component
	The picker's first group, for participants: their delegation's group and the team inboxes that
	are theirs. Renders nothing when the search leaves neither.
-->
<script lang="ts">
	import type { ChatInboxRow } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import PickerOption from './PickerOption.svelte';
	import { inboxDescription, inboxName, INBOX_ICON } from './chatLabels';

	interface Props {
		inboxes: readonly ChatInboxRow[];
		/** Whether the delegation's group is offered */
		delegation: boolean;
		disabled: boolean;
		onInbox: (option: ChatInboxRow) => void;
		onDelegation: () => void;
	}

	let { inboxes, delegation, disabled, onInbox, onDelegation }: Props = $props();
</script>

{#if inboxes.length > 0 || delegation}
	<section>
		<h3 class="text-base-content/60 mb-1 px-1 text-xs font-semibold tracking-wide uppercase">
			{m.chatGroupTeamAndDelegation()}
		</h3>
		<ul class="flex flex-col">
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
			{#each inboxes as option (`${option.inbox}/${option.committeeId}`)}
				<li>
					<PickerOption
						avatar={{ icon: INBOX_ICON[option.inbox] }}
						title={inboxName(option)}
						detail={inboxDescription(option.inbox)}
						{disabled}
						onclick={() => onInbox(option)}
						testId="chat-inbox-option"
					/>
				</li>
			{/each}
		</ul>
	</section>
{/if}
