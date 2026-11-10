<!--
	@component
	The conference's automatic mails. The switches and the sending pace wait for the save button and
	its preview of what changes, then save through their own mutations; the texts and the footer save
	in their editors.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import ConfigSave from '../configuration/ConfigSave.svelte';
	import TabIntro from '../configuration/sections/TabIntro.svelte';
	import EmailSettings from './EmailSettings.svelte';
	import { createEmailChanges, emailConfigChanges } from './emailChanges.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	/** The switches and the pace, held until the save button. */
	const changes = createEmailChanges();

	const pendingChanges = $derived(
		emailConfigChanges({ switches: changes.list, pace: changes.pace })
	);
	const saveLabel = $derived(
		pendingChanges.length > 0
			? m.saveSettingsWithChangeCount({ count: pendingChanges.length })
			: m.saveSettings()
	);

	let confirmSaveModalOpen = $state(false);

	/** One mutation for the pace and one per switch; switching on owes what the sweep then sends. */
	async function save() {
		const conferenceId = params.conferenceId;
		const pace = changes.pace;
		const switches = changes.list;
		const promise = Promise.all([
			...(pace
				? [
						client.mutate.setConferenceEmailsPerSecond({
							__args: { conferenceId, emailsPerSecond: pace.after }
						})
					]
				: []),
			...switches.map((change) =>
				client.mutate.setConferenceEmailEnabled({
					__args: {
						conferenceId,
						kind: change.kind,
						enabled: change.enabled,
						notifyExisting: change.notifyExisting
					}
				})
			)
		]);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		changes.saved({ pace, switches });
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-box max-sm:px-3">
	<h1 class="sr-only">{m.emailSettingsTab()}</h1>

	<!-- What the page is for, with the save button on the same row. -->
	<div class="mb-6 flex items-center gap-4">
		<TabIntro>
			{m.emailSettingsIntro()}
		</TabIntro>
		<button
			type="button"
			class="btn btn-primary btn-sm btn-square shrink-0"
			onclick={() => (confirmSaveModalOpen = true)}
			disabled={pendingChanges.length === 0}
			title={saveLabel}
			aria-label={saveLabel}
		>
			<i aria-hidden="true" class="ph-fill ph-floppy-disk"></i>
		</button>
	</div>

	<!-- The switches wait for the save button; their texts and footer save in their editors. -->
	<div class="flex flex-col gap-4">
		<p class="text-base-content/70 text-sm">
			<i aria-hidden="true" class="ph-duotone ph-clock mr-1"></i>
			{m.emailSettingsJobHint()}
		</p>
		<EmailSettings conferenceId={params.conferenceId} {changes} />
	</div>

	<ConfigSave
		bind:open={confirmSaveModalOpen}
		changes={pendingChanges}
		label={saveLabel}
		onconfirm={() => void save()}
	/>
</div>
