<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

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
	}
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
	<i class="fa-sharp-duotone fa-solid fa-id-card text-base-content/60 w-6 text-center text-lg"></i>
	<div class="flex min-w-48 grow flex-col">
		<span class="font-semibold">{m.accessCardId()}</span>
		{#if !accessCardId}
			<span class="text-base-content/60 text-sm">{m.noAccessCard()}</span>
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
				<i class="fa-sharp-duotone fa-solid fa-save"></i>
			</button>
		</form>
		{#if onNotifyFound}
			{@const notify = onNotifyFound}
			<button
				class="btn btn-sm"
				type="button"
				disabled={notifying}
				title={m.badgeFoundNotifyHint()}
				onclick={() => notifyFound(notify)}
			>
				<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
				{m.badgeFoundNotify()}
			</button>
		{/if}
	</div>
</div>
