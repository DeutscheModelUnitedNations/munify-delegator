<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import ScopePicker from '#lib/components/guide/ScopePicker.svelte';
	import { fetchGuideConference } from '#lib/components/guide/guideConference';
	import { scopeContextOf, type GuideScopeKind } from '#lib/guide/scope';
	import { pageCreatedToast } from '../workspaceData';

	/** Creates a general page: its title and where it is shared. */
	interface Props {
		open: boolean;
		conferenceId: string;
		onCreated: (pageId: string) => void;
	}

	let { open = $bindable(), conferenceId, onCreated }: Props = $props();

	const conference = $derived(await fetchGuideConference(conferenceId));
	const { year, seriesName } = $derived(scopeContextOf(conference));

	let title = $state('');
	let scope = $state<GuideScopeKind>('CONFERENCE');
	let creating = $state(false);

	async function create() {
		const trimmed = title.trim();
		if (!trimmed || creating) return;
		creating = true;
		try {
			const promise = client.mutate.createGuidePage({
				__args: { conferenceId, title: trimmed, scope },
				title: true
			});
			toast.promise(promise, pageCreatedToast);
			const page = await promise;
			open = false;
			title = '';
			onCreated(page.id);
		} finally {
			creating = false;
		}
	}
</script>

<Modal bind:open title={m.guideNewPage()}>
	<form
		class="flex flex-col gap-4"
		id="new-guide-page"
		onsubmit={(event) => {
			event.preventDefault();
			void create();
		}}
	>
		<label class="fieldset">
			<span class="fieldset-legend">{m.guidePageTitle()}</span>
			<input class="input w-full" bind:value={title} required maxlength="200" />
		</label>
		<ScopePicker bind:value={scope} series={seriesName} {year} />
	</form>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			type="submit"
			form="new-guide-page"
			disabled={!title.trim() || creating}
		>
			{m.guideNewPage()}
		</button>
	{/snippet}
</Modal>
