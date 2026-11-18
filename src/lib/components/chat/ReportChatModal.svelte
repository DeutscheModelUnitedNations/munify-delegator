<!--
	@component
	Asks participant care to look at a chat. Says plainly what a report does: while it is open,
	participant care reads the whole chat.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import { CHAT_REPORT_REASON_MAX_LENGTH } from '#lib/helpers/chat';

	let { open = $bindable(), chatId }: { open: boolean; chatId: string } = $props();

	let reason = $state('');
	let sending = $state(false);
	const fieldId = $props.id();

	async function report() {
		if (!reason.trim() || sending) return;
		sending = true;
		try {
			const promise = Promise.resolve(
				client.mutate.reportChat({ __args: { chatId, reason: reason.trim() } })
			);
			toast.promise(promise, {
				loading: m.chatReportSending(),
				success: m.chatReportSent(),
				error: m.chatReportFailed()
			});
			await promise;
			reason = '';
			open = false;
		} finally {
			sending = false;
		}
	}
</script>

<Modal bind:open title={m.chatReportTitle()}>
	<p class="text-base-content/70 mb-4 text-sm">{m.chatReportExplanation()}</p>
	<label class="label mb-1 text-sm" for={fieldId}>{m.chatReportReasonLabel()}</label>
	<textarea
		id={fieldId}
		class="textarea textarea-bordered w-full"
		rows="4"
		maxlength={CHAT_REPORT_REASON_MAX_LENGTH}
		bind:value={reason}
		data-testid="chat-report-reason"></textarea>
	{#snippet action()}
		<button class="btn btn-ghost" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-warning"
			disabled={!reason.trim() || sending}
			onclick={report}
			data-testid="chat-report-submit"
		>
			<i aria-hidden="true" class="ph-duotone ph-flag"></i>
			{m.chatReportSubmit()}
		</button>
	{/snippet}
</Modal>
