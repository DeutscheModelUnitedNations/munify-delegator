<!--
	@component
	What participant care sees above a chat it reads because of a report: that it is reading along,
	who the people are, and the switch that takes one of them out of the chats between participants.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from './ChatAvatar.svelte';
	import { contactAvatar, contactLabel, type ContactLabelSource } from './chatLabels';

	interface Props {
		contacts: readonly (ContactLabelSource & {
			participantId: string;
			suspended?: boolean | null;
		})[];
		people: readonly { participantId: string; name: string }[];
	}

	let { contacts, people }: Props = $props();

	const nameOf = (participantId: string) =>
		people.find((person) => person.participantId === participantId)?.name;

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

<div class="bg-warning/10 border-warning/30 flex flex-col gap-2 border-b px-4 py-3 text-sm">
	<p class="flex items-start gap-2">
		<i aria-hidden="true" class="ph-duotone ph-eye text-warning mt-0.5 text-base"></i>
		<span>{m.chatReviewBanner()}</span>
	</p>
	{#if contacts.length > 0}
		<ul class="flex flex-wrap gap-2">
			{#each contacts as contact (contact.participantId)}
				{@const name = nameOf(contact.participantId)}
				<li class="bg-base-100 border-base-300 flex items-center gap-2 rounded-lg border px-2 py-1">
					<ChatAvatar avatar={contactAvatar(contact)} size="sm" />
					<span class="flex flex-col leading-tight">
						<span class="font-medium">{contactLabel(contact)}</span>
						{#if name}<span class="text-base-content/60 text-xs">{name}</span>{/if}
					</span>
					<button
						type="button"
						class={['btn btn-xs', contact.suspended ? 'btn-outline' : 'btn-warning']}
						aria-pressed={!!contact.suspended}
						onclick={() =>
							setSuspended({
								participantId: contact.participantId,
								suspended: !contact.suspended
							})}
						data-testid="chat-suspend"
					>
						{contact.suspended ? m.chatUnsuspend() : m.chatSuspend()}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
