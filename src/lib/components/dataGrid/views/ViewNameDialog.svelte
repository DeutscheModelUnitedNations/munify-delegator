<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';

	/** What a saved view is called, and - where it is new - for whom it is. */
	export interface ViewScopeChoice {
		name: string;
		shared: boolean;
		global: boolean;
		isDefault: boolean;
	}

	interface Props {
		title: string;
		submitLabel: string;
		initialName?: string;
		/** Offer saving it shared; the shared choice starts as `initialShared` */
		canShare: boolean;
		initialShared?: boolean;
		/** Offer saving a shared view for every conference (system admins) */
		canShareGlobally: boolean;
		/** Ask nothing but the name (renaming) */
		nameOnly?: boolean;
		busy: boolean;
		onclose: () => void;
		onsubmit: (choice: ViewScopeChoice) => void;
	}

	let {
		title,
		submitLabel,
		initialName = '',
		canShare,
		initialShared = false,
		canShareGlobally,
		nameOnly = false,
		busy,
		onclose,
		onsubmit
	}: Props = $props();

	let open = $state(true);
	let name = $state(untrack(() => initialName));
	let shared = $state(untrack(() => initialShared && canShare));
	let global = $state(false);
	let isDefault = $state(false);

	const trimmed = $derived(name.trim());
	const tooLong = $derived(trimmed.length > 80);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!trimmed || tooLong) return;
		onsubmit({ name: trimmed, shared, global, isDefault: shared && isDefault });
	}
</script>

<Modal bind:open {title} {onclose}>
	<form id="view-name-form" class="flex flex-col gap-4" onsubmit={submit}>
		<label class="form-control w-full">
			<span class="label-text mb-1">{m.dataGridViewName()}</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="input input-bordered w-full"
				class:input-error={tooLong}
				bind:value={name}
				maxlength="120"
				autofocus
				required
			/>
			{#if tooLong}
				<span class="text-error mt-1 text-sm">{m.tableViewNameTooLong({ max: 80 })}</span>
			{/if}
		</label>
		{#if !nameOnly}
			<fieldset class="flex flex-col gap-2">
				<label class="flex cursor-pointer items-center gap-3">
					<input
						type="radio"
						class="radio radio-sm"
						name="scope"
						checked={!shared}
						onchange={() => (shared = false)}
					/>
					<span>
						<span class="font-medium">{m.dataGridViewPersonal()}</span>
						<span class="text-base-content/60 block text-sm">{m.dataGridViewPersonalHint()}</span>
					</span>
				</label>
				<label
					class="flex items-center gap-3"
					class:cursor-pointer={canShare}
					class:opacity-50={!canShare}
				>
					<input
						type="radio"
						class="radio radio-sm"
						name="scope"
						checked={shared}
						disabled={!canShare}
						onchange={() => (shared = true)}
					/>
					<span>
						<span class="font-medium">{m.dataGridViewShared()}</span>
						<span class="text-base-content/60 block text-sm">
							{canShare ? m.dataGridViewSharedHint() : m.dataGridViewSharedNotAllowed()}
						</span>
					</span>
				</label>
			</fieldset>
			<label
				class="flex items-center gap-3"
				class:cursor-pointer={!shared || canShareGlobally}
				class:opacity-50={shared && !canShareGlobally}
			>
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					bind:checked={global}
					disabled={shared && !canShareGlobally}
				/>
				<span>
					<span class="font-medium">{m.dataGridViewEveryConference()}</span>
					<span class="text-base-content/60 block text-sm"
						>{m.dataGridViewEveryConferenceHint()}</span
					>
				</span>
			</label>
			{#if shared}
				<label class="flex cursor-pointer items-center gap-3">
					<input type="checkbox" class="checkbox checkbox-sm" bind:checked={isDefault} />
					<span class="font-medium">{m.dataGridViewSetDefault()}</span>
				</label>
			{/if}
		{/if}
	</form>
	{#snippet action()}
		<button class="btn btn-ghost" onclick={onclose}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			type="submit"
			form="view-name-form"
			disabled={busy || !trimmed || tooLong || (shared && global && !canShareGlobally)}
		>
			{#if busy}<span class="loading loading-spinner loading-sm"></span>{/if}
			{submitLabel}
		</button>
	{/snippet}
</Modal>
