<!--
	@component
	The terms of the message service. With `onAccepted` it asks for the reader's agreement, which a
	participant has to give before their first message, and calls it once that is stored; without,
	it only shows them. The text scrolls in a region of its own, which opens at the top, and the
	agreement can only be given once the reader has scrolled through to its end.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import type { Attachment } from 'svelte/attachments';
	import {
		MESSAGING_TERMS_VERSION,
		messagingTermsSections,
		scrolledToEnd
	} from '#lib/helpers/messagingTerms';

	interface Props {
		open: boolean;
		onAccepted?: () => void | Promise<void>;
	}

	let { open = $bindable(), onAccepted }: Props = $props();

	let agreed = $state(false);
	let saving = $state(false);
	/** Whether the reader has been at the end of the text; it stays once reached. */
	let read = $state(false);

	function noteScroll(region: HTMLElement) {
		if (scrolledToEnd(region)) read = true;
	}

	/** A text short enough to fit needs no scrolling; each opening starts unread. */
	const watchScroll: Attachment<HTMLElement> = (region) => {
		read = false;
		agreed = false;
		const frame = requestAnimationFrame(() => noteScroll(region));
		return () => cancelAnimationFrame(frame);
	};

	async function accept() {
		// the button is disabled until the box is ticked and while this runs
		if (!onAccepted) return;
		saving = true;
		try {
			await client.mutate.acceptMessagingTerms({ __args: { version: MESSAGING_TERMS_VERSION } });
			open = false;
			await onAccepted();
		} catch {
			toast.error(m.chatTermsAcceptFailed());
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title={m.chatTermsTitle()}>
	<div class="flex flex-col gap-4" data-testid="chat-terms">
		{#if onAccepted}
			<div
				role="note"
				class="border-info/40 bg-info/10 text-base-content flex items-start gap-3 rounded-lg border p-3 text-sm"
			>
				<i aria-hidden="true" class="ph-duotone ph-arrow-circle-down text-info text-xl"></i>
				<div class="flex flex-col gap-1">
					<p>{m.chatTermsIntro()}</p>
					<p class="font-semibold">{m.chatTermsScrollHint()}</p>
				</div>
			</div>
		{/if}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrolling region has to take the keyboard -->
		<div
			role="region"
			aria-label={m.chatTermsTitle()}
			tabindex="0"
			class="border-base-300 flex max-h-80 sm:max-h-96 flex-col gap-5 overflow-y-auto rounded-lg border p-4"
			onscroll={(event) => noteScroll(event.currentTarget)}
			{@attach watchScroll}
			data-testid="chat-terms-text"
		>
			{#each messagingTermsSections() as section (section.title)}
				<section class="flex flex-col gap-2">
					<h3 class="flex items-center gap-2 font-semibold">
						<i aria-hidden="true" class="ph-duotone ph-{section.icon} text-primary text-lg"></i>
						{section.title}
					</h3>
					{#each section.paragraphs as paragraph (paragraph)}
						<p class="text-base-content/80 text-sm leading-relaxed">{paragraph}</p>
					{/each}
				</section>
			{/each}
		</div>
		{#if onAccepted}
			<label
				class="bg-base-200 flex items-start gap-3 rounded-lg p-3 text-sm {read
					? 'cursor-pointer'
					: 'opacity-60'}"
			>
				<input
					type="checkbox"
					class="checkbox checkbox-primary checkbox-sm mt-0.5"
					bind:checked={agreed}
					disabled={!read}
					data-testid="chat-terms-agree"
				/>
				<span>{m.chatTermsAgree()}</span>
			</label>
		{/if}
	</div>
	{#snippet action()}
		{#if onAccepted}
			<button type="button" class="btn btn-ghost" onclick={() => (open = false)}>
				{m.cancel()}
			</button>
			<button
				type="button"
				class="btn btn-primary"
				disabled={!agreed || saving}
				onclick={accept}
				data-testid="chat-terms-accept"
			>
				<i aria-hidden="true" class="ph-duotone ph-paper-plane-right"></i>
				{m.chatTermsAcceptAndSend()}
			</button>
		{:else}
			<button type="button" class="btn" onclick={() => (open = false)}>{m.close()}</button>
		{/if}
	{/snippet}
</Modal>
