<!--
	@component
	One person of a reported chat in its case file: name and role, whether they filed a report, the
	settled reports there were before, and what participant care can do: take them out of the chats
	between participants, write to them, open their card.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from '#lib/components/chat/ChatAvatar.svelte';
	import UserCardButton from '#lib/components/chat/UserCardButton.svelte';
	import WriteToDelegateButton from '#lib/components/chat/WriteToDelegateButton.svelte';
	import {
		contactAvatar,
		contactLabel,
		type ContactLabelSource
	} from '#lib/components/chat/chatLabels';

	interface Props {
		conferenceId: string;
		person: {
			participantId: string;
			userId: string;
			name: string;
			earlierReports: number;
			/** Whether one of the chat's open reports is theirs */
			reported: boolean;
			/** Their seat; none for somebody who lost it */
			contact?: ContactLabelSource & { suspended?: boolean | null };
		};
	}

	let { conferenceId, person }: Props = $props();

	async function setSuspended({
		participantId,
		suspended
	}: {
		participantId: string;
		suspended: boolean;
	}) {
		const promise = Promise.resolve(
			client.mutate.setMessagingSuspended({ __args: { participantId, suspended } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: suspended ? m.chatSuspendedDone() : m.chatUnsuspendedDone(),
			error: m.chatSaveFailed()
		});
		await promise;
	}
</script>

<li class="flex items-start gap-3 py-3">
	{#if person.contact}
		<ChatAvatar avatar={contactAvatar(person.contact)} size="sm" />
	{:else}
		<ChatAvatar avatar={{ icon: 'user' }} size="sm" />
	{/if}
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
			{person.name}
			{#if person.reported}
				<span class="badge badge-info badge-soft badge-sm">{m.chatCaseReporter()}</span>
			{/if}
			{#if person.contact?.suspended}
				<span class="badge badge-error badge-sm">{m.chatSuspendedBadge()}</span>
			{/if}
		</span>
		<span class="text-base-content/60 text-xs">
			{person.contact ? contactLabel(person.contact) : m.chatFormerParticipant()}
		</span>
		{#if person.earlierReports > 0}
			<span class="text-error text-xs font-medium">
				{m.chatCaseEarlierReports({ count: person.earlierReports })}
			</span>
		{/if}
		{#if person.contact}
			{@const suspended = !!person.contact.suspended}
			<button
				type="button"
				class={['btn btn-ghost btn-xs -ml-2 mt-1 gap-1.5 self-start', !suspended && 'text-error']}
				aria-pressed={suspended}
				onclick={() => setSuspended({ participantId: person.participantId, suspended: !suspended })}
				data-testid="chat-suspend"
			>
				<i aria-hidden="true" class={['ph-duotone', suspended ? 'ph-lock-open' : 'ph-prohibit']}
				></i>
				{suspended ? m.chatUnsuspend() : m.chatSuspend()}
			</button>
		{/if}
	</div>
	<div class="flex shrink-0 items-center">
		<WriteToDelegateButton {conferenceId} participantId={person.participantId} compact />
		<UserCardButton userId={person.userId} name={person.name} />
	</div>
</li>
