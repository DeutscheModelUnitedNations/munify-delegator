<!--
	@component
	The terms of the message service. With `onAccepted` it asks for the reader's agreement, which a
	participant has to give before their first message, and calls it once that is stored; without,
	it only shows them.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import { MESSAGING_TERMS_VERSION, messagingTermsSections } from '#lib/helpers/messagingTerms';

	interface Props {
		open: boolean;
		onAccepted?: () => void | Promise<void>;
	}

	let { open = $bindable(), onAccepted }: Props = $props();

	let agreed = $state(false);
	let saving = $state(false);

	async function accept() {
		// the button is disabled until the box is ticked and while this runs
		if (!onAccepted) return;
		saving = true;
		try {
			await client.mutate.acceptMessagingTerms({ __args: { version: MESSAGING_TERMS_VERSION } });
			open = false;
			agreed = false;
			await onAccepted();
		} catch {
			toast.error(m.chatTermsAcceptFailed());
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title={m.chatTermsTitle()}>
	<div class="flex flex-col gap-5" data-testid="chat-terms">
		{#if onAccepted}
			<p class="text-base-content/70 text-sm">{m.chatTermsIntro()}</p>
		{/if}
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
		{#if onAccepted}
			<label class="bg-base-200 flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-primary checkbox-sm mt-0.5"
					bind:checked={agreed}
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
