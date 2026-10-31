<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import { emailKindTexts } from '#lib/helpers/emailKindTexts';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import type { EmailPrompt } from './emailPrompt.svelte';

	/** Asks whether the mails an action made due go out now, or later from the e-mail page. */
	interface Props {
		prompt: EmailPrompt;
	}

	let { prompt }: Props = $props();

	const offered = $derived(prompt.offered);
	const total = $derived(offered?.open.reduce((sum, kind) => sum + kind.open, 0) ?? 0);
	let sending = $state(false);

	async function send() {
		if (!offered) return;
		sending = true;
		try {
			const count = await client.mutate.sendOpenEmails({
				__args: {
					conferenceId: offered.conferenceId,
					kinds: offered.open.map((kind) => kind.kind)
				}
			});
			toast.success(m.emailSendingStarted({ count: Number(count) }));
			prompt.close();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			sending = false;
		}
	}
</script>

<Modal open={!!offered} title={m.emailPromptTitle()} onclose={() => prompt.close()}>
	<div class="flex flex-col gap-3">
		<p>{m.emailPromptText()}</p>
		<ul class="flex flex-col gap-1">
			{#each offered?.open ?? [] as kind (kind.kind)}
				<li class="flex flex-wrap items-center gap-2">
					<i class="fa-sharp-duotone fa-solid fa-envelope text-primary"></i>
					<span class="font-medium">{emailKindTexts(kind.kind).title}</span>
					<span class="badge badge-neutral badge-soft badge-sm">
						{m.emailOpenCount({ count: kind.open })}
					</span>
					{#if kind.automatic}
						<span class="text-base-content/60 text-xs">{m.emailPromptAutomatic()}</span>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="text-base-content/60 text-sm">{m.emailPromptLaterHint()}</p>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => prompt.close()}>{m.emailPromptLater()}</button>
		<button class="btn btn-primary" disabled={sending} onclick={send}>
			{#if sending}<span class="loading loading-spinner loading-sm"></span>{/if}
			{m.emailPromptSend({ count: total })}
		</button>
	{/snippet}
</Modal>
