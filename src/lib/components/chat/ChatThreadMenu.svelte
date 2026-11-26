<!--
	@component
	What a party of a chat between participants can do about it: block the other party of a direct
	chat, mute a group for themselves (the team in a group too), and report the chat to participant
	care.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import ReportChatModal from './ReportChatModal.svelte';

	interface Props {
		chatId: string;
		/** A direct chat, whose other party can be blocked */
		direct: boolean;
		blockedByMe: boolean;
		/** A group: whether the caller muted it; undefined for every other chat */
		muted?: boolean;
		/** Whether the caller can report the chat: its participants */
		canReport?: boolean;
	}

	let { chatId, direct, blockedByMe, muted, canReport = true }: Props = $props();

	async function setMuted(mute: boolean) {
		const promise = Promise.resolve(
			client.mutate.setChatMuted({ __args: { chatId, muted: mute } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: mute ? m.chatMutedDone() : m.chatUnmutedDone(),
			error: m.chatSaveFailed()
		});
		await promise;
	}

	let reportOpen = $state(false);

	async function setBlocked(blocked: boolean) {
		const promise = Promise.resolve(client.mutate.setChatBlocked({ __args: { chatId, blocked } }));
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: blocked ? m.chatBlockedDone() : m.chatUnblockedDone(),
			error: m.chatSaveFailed()
		});
		await promise;
	}
</script>

<div class="dropdown dropdown-end">
	<button
		type="button"
		class="btn btn-ghost btn-sm btn-square"
		aria-label={m.chatMoreActions()}
		data-testid="chat-menu"
	>
		<i aria-hidden="true" class="ph-duotone ph-dots-three-vertical text-lg"></i>
	</button>
	<ul
		class="menu dropdown-content bg-base-100 rounded-box border-base-300 z-10 w-64 border p-2 shadow-lg"
	>
		{#if direct}
			<li>
				<button type="button" onclick={() => setBlocked(!blockedByMe)} data-testid="chat-block">
					<i aria-hidden="true" class="ph-duotone ph-prohibit"></i>
					{blockedByMe ? m.chatUnblock() : m.chatBlock()}
				</button>
			</li>
		{/if}
		{#if muted !== undefined}
			<li>
				<button
					type="button"
					onclick={() => setMuted(!muted)}
					aria-pressed={muted}
					data-testid="chat-mute"
				>
					<i aria-hidden="true" class={['ph-duotone', muted ? 'ph-bell' : 'ph-bell-slash']}></i>
					{muted ? m.chatUnmute() : m.chatMute()}
				</button>
			</li>
		{/if}
		{#if canReport}
			<li>
				<button type="button" onclick={() => (reportOpen = true)} data-testid="chat-report">
					<i aria-hidden="true" class="ph-duotone ph-flag"></i>
					{m.chatReport()}
				</button>
			</li>
		{/if}
	</ul>
</div>

<ReportChatModal bind:open={reportOpen} {chatId} />
