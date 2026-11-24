<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import ActionModal from '#lib/components/ActionModal.svelte';

	interface Props {
		accessCardId: string | null | undefined;
		onSave: (value: string | null) => Promise<void>;
		/** Tells the person by mail that their lost badge was found; absent while they have no row yet. */
		onNotifyFound?: () => Promise<void>;
	}

	let { accessCardId, onSave, onNotifyFound }: Props = $props();

	// Follows the stored id, so a save made elsewhere shows up here too.
	let localValue = $derived(accessCardId ?? '');

	const dirty = $derived(localValue.trim() !== (accessCardId ?? ''));

	let notifying = $state(false);
	let confirmingNotify = $state(false);

	const save = () => {
		const promise = onSave(localValue.trim() || null);
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
	};

	async function notifyFound(notify: () => Promise<void>) {
		if (notifying) return;
		notifying = true;
		const promise = notify();
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.badgeFoundSent(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		await promise.catch(() => undefined);
		notifying = false;
		confirmingNotify = false;
	}
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
	<i
		aria-hidden="true"
		class="ph-duotone ph-identification-card text-base-content/60 w-5 text-center"
	></i>
	<div class="flex min-w-32 grow flex-col text-sm">
		<span>{m.accessCardId()}</span>
		{#if !accessCardId}
			<span class="text-base-content/60">{m.noAccessCard()}</span>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<form
			class="join"
			onsubmit={(event) => {
				event.preventDefault();
				save();
			}}
		>
			<input
				class="input input-sm join-item w-48 font-mono"
				bind:value={localValue}
				type="text"
				placeholder={m.accessCardId()}
				aria-label={m.accessCardId()}
			/>
			<button
				class="btn btn-sm btn-square join-item {dirty ? 'btn-primary' : ''}"
				type="submit"
				disabled={!dirty}
				aria-label={m.save()}
				title={m.save()}
			>
				<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
			</button>
		</form>
		{#if onNotifyFound}
			{@const notify = onNotifyFound}
			<button
				class="btn btn-sm"
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
	</div>
</div>
