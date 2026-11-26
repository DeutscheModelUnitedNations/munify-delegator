<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	/**
	 * Starting the payment over: the reference is given up (kept for participant care, who can still
	 * match a transfer made with it) and the page asks again whom to pay for.
	 */
	interface Props {
		paymentId: string;
		/** They said they transferred already: then the money may be on its way with the old one. */
		transferReported: boolean;
		/** The reference was given up: whom to pay for is asked again. */
		onDiscarded: () => void;
	}

	let { paymentId, transferReported, onDiscarded }: Props = $props();

	let open = $state(false);
	let discarding = $state(false);

	async function discard() {
		discarding = true;
		const promise = client.mutate.discardPaymentTransaction({
			__args: { id: paymentId },
			discardedAt: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
			open = false;
			onDiscarded();
		} finally {
			discarding = false;
		}
	}
</script>

<button type="button" class="btn btn-ghost" onclick={() => (open = true)}>
	<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
	{m.paymentRestart()}
</button>

<Modal bind:open title={m.paymentRestartTitle()}>
	<p>{m.paymentRestartText()}</p>
	{#if transferReported}
		<div role="alert" class="alert alert-warning mt-4">
			<i aria-hidden="true" class="ph-duotone ph-warning text-2xl"></i>
			<span>{m.paymentRestartAfterTransfer()}</span>
		</div>
	{/if}
	{#snippet action()}
		<button type="button" class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
		<button type="button" class="btn btn-error" disabled={discarding} onclick={discard}>
			{m.paymentRestartConfirm()}
		</button>
	{/snippet}
</Modal>
