<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import ConfigChangePreview from '../configuration/ConfigChangePreview.svelte';
	import EmailSettings from './EmailSettings.svelte';
	import { createEmailChanges, emailConfigChanges } from './emailChanges.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	/** The switches wait here until saved; the texts save in their own editor. */
	const changes = createEmailChanges();
	const pending = $derived(emailConfigChanges(changes.list));
	let confirming = $state(false);

	/** One mutation per switch; the sweep each one schedules sends what switching on owes. */
	async function save() {
		confirming = false;
		const promise = Promise.all(
			changes.list.map((change) =>
				client.mutate.setConferenceEmailEnabled({
					__args: {
						conferenceId,
						kind: change.kind,
						enabled: change.enabled,
						notifyExisting: change.notifyExisting
					}
				})
			)
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		changes.saved();
	}

	const saveLabel = $derived(
		pending.length > 0 ? m.saveSettingsWithChangeCount({ count: pending.length }) : m.saveSettings()
	);
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-start gap-4">
		<div class="flex min-w-0 flex-1 flex-col gap-1 text-sm">
			<p>{m.emailSettingsIntro()}</p>
			<p class="text-base-content/70">
				<i class="fa-sharp-duotone fa-solid fa-clock mr-1"></i>
				{m.emailSettingsJobHint()}
			</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm shrink-0"
			disabled={pending.length === 0}
			onclick={() => (confirming = true)}
		>
			<i class="fas fa-save"></i>
			{saveLabel}
		</button>
	</div>

	{#key conferenceId}
		<EmailSettings {conferenceId} {changes} />
	{/key}
</div>

<Modal bind:open={confirming} title={m.confirmSave()}>
	<ConfigChangePreview changes={pending} />
	{#snippet action()}
		<button class="btn" onclick={() => (confirming = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" disabled={pending.length === 0} onclick={save}>
			<i class="fas fa-save mr-2"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>
