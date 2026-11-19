<!--
	@component
	The field a chat is written in: Enter sends, Shift+Enter breaks the line. Shows instead why the
	caller cannot write right now (`chat.writeRefusal`). A paper passed along goes with the next
	message. A participant who has not agreed to the terms of the message service is shown them on
	their first message, which goes out once they agree. A message that seems to hold contact
	details asks once more before it goes (`findPersonalDetails`).
-->
<script lang="ts" module>
	// what was typed into each chat and not sent, kept while switching chats; only the browser
	// ever writes here, the server renders every composer empty
	// nothing renders from it, so it needs no reactivity
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const drafts = new Map<string, string>();
</script>

<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { slide } from 'svelte/transition';
	import { tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { CHAT_MESSAGE_MAX_LENGTH } from '#lib/helpers/chat';
	import { refusalText } from '#lib/helpers/chatRefusalText';
	import {
		findPersonalDetails,
		sendStep,
		type PersonalDetailKind
	} from '#lib/helpers/personalDetails';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
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

	let draft = $state(untrack(() => drafts.get(chatId) ?? ''));
	$effect(() => {
		if (draft) drafts.set(chatId, draft);
		else drafts.delete(chatId);
	});
	let sending = $state(false);
	let field = $state<HTMLTextAreaElement>();
	// a participant agrees to the terms before their first message: the API asks for it
	let termsOpen = $state(false);
	/** The text the personal details warning is shown for. Editing the draft takes it away. */
	let warnedFor = $state<string | null>(null);
	/** The text the writer chose to send despite the warning, so the terms dialog does not ask again. */
	let sendAnyway = $state<string | null>(null);

	const detailLabels: Record<PersonalDetailKind, () => string> = {
		PHONE: m.chatPersonalDetailPhone,
		EMAIL: m.chatPersonalDetailEmail,
		MESSENGER: m.chatPersonalDetailMessenger
	};
	const warning = $derived.by(() => {
		if (warnedFor === null || warnedFor !== draft.trim()) return null;
		const labels = findPersonalDetails(warnedFor).map((kind) => detailLabels[kind]());
		return m.chatPersonalDetailsWarning({
			details: new Intl.ListFormat(getLocale(), { type: 'disjunction' }).format(labels)
		});
	});

	async function deliver(body: string) {
		await client.mutate.sendChatMessage({ __args: { chatId, body, paperId }, id: true });
		draft = '';
		warnedFor = null;
		sendAnyway = null;
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
		const step = sendStep({ body, sending, confirmed: sendAnyway });
		if (step === 'wait') return;
		if (step === 'warn') {
			warnedFor = body;
			return;
		}
		sending = true;
		try {
			await deliver(body);
		} catch (error) {
			onSendFailed(error);
		} finally {
			sending = false;
		}
	}

	function confirmSend() {
		sendAnyway = draft.trim();
		void send();
	}

	// opening a chat with a mouse or trackpad goes straight to writing; on touch screens the
	// keyboard would cover the messages
	function focusWithFinePointer(node: HTMLTextAreaElement) {
		if (window.matchMedia('(pointer: fine)').matches) node.focus({ preventScroll: true });
	}

	function onKeydown(event: KeyboardEvent) {
		// not while an input method is composing, whose Enter picks a candidate
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		void send();
	}
</script>

<!-- on a wide screen the field keeps to the column the messages stay in -->
<footer class="px-3 pt-1 pb-3 *:mx-auto *:max-w-4xl sm:px-5">
	{#if refusal}
		<p
			class="bg-base-200 text-base-content/70 flex items-start gap-2 rounded-box px-3 py-2.5 text-sm"
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
		{#if warning}
			<div
				role="alert"
				class="border-warning/50 bg-warning/10 rounded-box mb-2 flex flex-col gap-2 border p-3 text-sm sm:flex-row sm:items-center"
				data-testid="chat-personal-details-warning"
			>
				<p class="flex grow items-start gap-2">
					<i aria-hidden="true" class="ph-duotone ph-shield-warning text-warning mt-0.5 text-lg"
					></i>
					<span>{warning}</span>
				</p>
				<div class="flex shrink-0 gap-2 self-end sm:self-auto">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => field?.focus()}>
						{m.chatPersonalDetailsEdit()}
					</button>
					<button
						type="button"
						class="btn btn-warning btn-sm"
						disabled={sending}
						onclick={confirmSend}
						data-testid="chat-personal-details-send"
					>
						{m.chatPersonalDetailsSendAnyway()}
					</button>
				</div>
			</div>
		{/if}
		<!-- field and button share one surface; the ring shows where typing goes -->
		<form
			class="bg-base-200 focus-within:ring-primary flex items-end gap-2 rounded-box py-1.5 pr-1.5 pl-3 ring-1 ring-transparent transition-shadow"
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<textarea
				bind:this={field}
				bind:value={draft}
				class="placeholder:text-base-content/50 field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 leading-snug outline-none"
				rows="1"
				maxlength={CHAT_MESSAGE_MAX_LENGTH}
				placeholder={m.chatWritePlaceholder()}
				aria-label={m.chatWritePlaceholder()}
				onkeydown={onKeydown}
				{@attach focusWithFinePointer}
				data-testid="chat-input"></textarea>
			<button
				type="submit"
				class="btn btn-primary btn-sm btn-square mb-0.5"
				disabled={!draft.trim() || sending}
				aria-label={m.chatSend()}
				data-testid="chat-send"
			>
				<i aria-hidden="true" class="ph-fill ph-paper-plane-right"></i>
			</button>
		</form>
		{#if draft}
			<p
				class="text-base-content/50 mt-1 px-1 text-xs max-sm:hidden"
				transition:slide={{ duration: prefersReducedMotion.current ? 0 : 150 }}
			>
				{m.chatComposerHint()}
			</p>
		{/if}
	{/if}
</footer>

<MessagingTermsModal bind:open={termsOpen} onAccepted={send} />
