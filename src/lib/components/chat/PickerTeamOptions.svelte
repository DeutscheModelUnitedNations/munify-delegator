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
			{#each inboxes as option (`${option.inbox}/${option.committeeId}/${option.trustedPersonId}`)}
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
