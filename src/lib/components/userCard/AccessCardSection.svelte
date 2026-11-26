<script lang="ts">
	import { errorToastMessage } from '#lib/utils/toast';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import EditableRow from './sections/EditableRow.svelte';

	/** The person's access card, and that it was found after they lost it. */
	interface Props {
		accessCardId: string | null | undefined;
		onSave: (value: string) => Promise<void>;
		/** Tells the person by mail that their lost badge was found; absent while they have no row yet. */
		onNotifyFound?: () => Promise<void>;
	}

	let { accessCardId, onSave, onNotifyFound }: Props = $props();

	let notifying = $state(false);
	let confirmingNotify = $state(false);

	async function notifyFound(notify: () => Promise<void>) {
		if (notifying) return;
		notifying = true;
		const promise = notify();
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.badgeFoundSent(),
			error: errorToastMessage
		});
		await promise.catch(() => undefined);
		notifying = false;
		confirmingNotify = false;
	}
</script>

{#snippet found()}
	{#if onNotifyFound}
		{@const notify = onNotifyFound}
		<button
			class="btn btn-sm btn-ghost text-primary"
			type="button"
			disabled={notifying}
			title={m.badgeFoundNotifyHint()}
			onclick={() => (confirmingNotify = true)}
		>
			<i aria-hidden="true" class="ph-duotone ph-envelope"></i>
			{m.badgeFoundNotify()}
		</button>
		{#if confirmingNotify}
			<ActionModal
				title={m.badgeFoundConfirmTitle()}
				confirmLabel={m.badgeFoundNotify()}
				loading={notifying}
				onConfirm={() => notifyFound(notify)}
				onClose={() => (confirmingNotify = false)}
			>
				<p>{m.badgeFoundConfirmText()}</p>
			</ActionModal>
		{/if}
	{/if}
{/snippet}

<EditableRow
	icon="identification-card"
	title={m.accessCardId()}
	value={accessCardId ?? undefined}
	{onSave}
	actions={accessCardId ? found : undefined}
/>
