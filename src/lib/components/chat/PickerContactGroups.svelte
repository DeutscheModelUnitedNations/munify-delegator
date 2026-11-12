<!--
	@component
	The people to write to, by committee, each as role and committee (never a name).
-->
<script lang="ts">
	import type { ChatContactRow } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import PickerOption from './PickerOption.svelte';
	import { contactAvatar, contactDetail, contactName } from './chatLabels';
	import { OTHER_GROUP } from './contactGroups';

	interface Props {
		groups: readonly { key: string; name: string; contacts: readonly ChatContactRow[] }[];
		disabled: boolean;
		onPick: (contact: ChatContactRow) => void;
	}

	let { groups, disabled, onPick }: Props = $props();
</script>

{#each groups as group (group.key)}
	<section>
		<h3 class="text-base-content/60 mb-1 px-1 text-xs font-semibold tracking-wide uppercase">
			{group.key === OTHER_GROUP ? m.chatGroupWithoutCommittee() : group.name}
		</h3>
		<ul class="grid grid-cols-1 sm:grid-cols-2">
			{#each group.contacts as contact (contact.participantId)}
				<li>
					<PickerOption
						avatar={contactAvatar(contact)}
						title={contactName(contact)}
						detail={contactDetail(contact)}
						{disabled}
						onclick={() => onPick(contact)}
						testId="chat-contact"
					/>
				</li>
			{/each}
		</ul>
	</section>
{/each}
