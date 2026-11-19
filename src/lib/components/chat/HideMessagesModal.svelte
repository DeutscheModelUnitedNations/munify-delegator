<!--
	@component
	Hides messages of a reported chat for everybody of it: one message, or everything a person wrote
	into it so far. Participant care gives a reason for the team and confirms that it is final; the
	text stays with the report as evidence.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import { CHAT_HIDE_REASON_MAX_LENGTH } from '#lib/helpers/chat';
	import type { HideTarget } from './hiddenMessages';

	let { open = $bindable(), target }: { open: boolean; target: HideTarget } = $props();

	let reason = $state('');
	let hiding = $state(false);
	const fieldId = $props.id();

	function hide(trimmed: string) {
		return target.kind === 'message'
			? Promise.resolve(
					client.mutate.hideChatMessage({ __args: { id: target.messageId, reason: trimmed } })
				).then(() => m.chatHideDone())
			: Promise.resolve(
					client.mutate.hideChatMessagesOf({
						__args: { chatId: target.chatId, participantId: target.participantId, reason: trimmed }
					})
				).then((count) => m.chatHideAllDone({ count }));
	}

	async function confirm() {
		const trimmed = reason.trim();
		if (!trimmed || hiding) return;
		hiding = true;
		try {
			const promise = hide(trimmed);
			toast.promise(promise, {
				loading: m.chatSaving(),
				success: (done) => done,
				error: m.chatSaveFailed()
			});
			await promise;
			reason = '';
			open = false;
		} finally {
			hiding = false;
		}
	}
</script>

<Modal
	bind:open
	title={target.kind === 'message'
		? m.chatHideMessage()
		: m.chatHideAllTitle({ name: target.name })}
>
	<div class="alert alert-warning mb-4 text-sm" role="note">
		<i aria-hidden="true" class="ph-duotone ph-warning"></i>
		<span>{m.chatHideFinalHint()}</span>
	</div>
	{#if target.kind === 'person'}
		<p class="text-base-content/70 mb-4 text-sm">{m.chatHideAllHint()}</p>
	{/if}
	<label class="label mb-1 text-sm" for={fieldId}>{m.chatHideReasonLabel()}</label>
	<textarea
		id={fieldId}
		class="textarea textarea-bordered w-full"
		rows="3"
		maxlength={CHAT_HIDE_REASON_MAX_LENGTH}
		placeholder={m.chatHideReasonPlaceholder()}
		bind:value={reason}
		data-testid="chat-hide-reason"></textarea>
	{#snippet action()}
		<button class="btn btn-ghost" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-error"
			disabled={!reason.trim() || hiding}
			onclick={confirm}
			data-testid="chat-hide-confirm"
		>
			<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
			{m.chatHideConfirm()}
		</button>
	{/snippet}
</Modal>
