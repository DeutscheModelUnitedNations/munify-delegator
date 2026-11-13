<!--
	@component
	The field a chat is written in: Enter sends, Shift+Enter breaks the line. Shows instead why the
	caller cannot write right now (`chat.writeRefusal`). A paper passed along goes with the next
	message. A participant who has not agreed to the terms of the message service is shown them on
	their first message, which goes out once they agree.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { CHAT_MESSAGE_MAX_LENGTH } from '#lib/helpers/chat';
	import { refusalText } from '#lib/helpers/chatRefusalText';
	import { m } from '#lib/paraglide/messages';
	import { hasErrorCode } from '#lib/api/errorCodes';
	import MessagingTermsModal from './MessagingTermsModal.svelte';
	import { chatSendError } from './inboxChoice';

	interface Props {
		chatId: string;
		refusal: string | null;
		paperId?: string | null;
		onPaperSent?: () => void;
	}

	let { chatId, refusal, paperId = null, onPaperSent = () => {} }: Props = $props();

	let draft = $state('');
	let sending = $state(false);
	let field = $state<HTMLTextAreaElement>();
	// a participant agrees to the terms before their first message: the API asks for it
	let termsOpen = $state(false);

	async function deliver(body: string) {
		await client.mutate.sendChatMessage({ __args: { chatId, body, paperId }, id: true });
		draft = '';
		if (paperId) onPaperSent();
		await tick();
		field?.focus();
	}

	function onSendFailed(error: unknown) {
		if (hasErrorCode({ err: error, code: 'TERMS_NOT_ACCEPTED' })) termsOpen = true;
		else toast.error(chatSendError(error));
	}

	async function send() {
		const body = draft.trim();
		if (!body || sending) return;
		sending = true;
		try {
			await deliver(body);
		} catch (error) {
			onSendFailed(error);
		} finally {
			sending = false;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		// not while an input method is composing, whose Enter picks a candidate
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		void send();
	}
</script>

<footer class="border-base-300 border-t p-3 sm:px-4">
	{#if refusal}
		<p
			class="bg-base-200 text-base-content/70 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
			data-testid="chat-refusal"
		>
			<i aria-hidden="true" class="ph-duotone ph-lock-simple mt-0.5"></i>
			<span>{refusalText(refusal)}</span>
		</p>
	{:else}
		{#if paperId}
			<p class="text-base-content/70 mb-2 flex items-center gap-2 text-xs">
				<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
				{m.chatPaperAttached()}
			</p>
		{/if}
		<form
			class="flex items-end gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<textarea
				bind:this={field}
				bind:value={draft}
				class="textarea textarea-bordered field-sizing-content max-h-40 min-h-11 flex-1 resize-none leading-snug"
				rows="1"
				maxlength={CHAT_MESSAGE_MAX_LENGTH}
				placeholder={m.chatWritePlaceholder()}
				aria-label={m.chatWritePlaceholder()}
				onkeydown={onKeydown}
				data-testid="chat-input"></textarea>
			<button
				type="submit"
				class="btn btn-primary btn-square"
				disabled={!draft.trim() || sending}
				aria-label={m.chatSend()}
				data-testid="chat-send"
			>
				<i aria-hidden="true" class="ph-fill ph-paper-plane-right text-lg"></i>
			</button>
		</form>
	{/if}
</footer>

<MessagingTermsModal bind:open={termsOpen} onAccepted={send} />
