<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canEditConference } from '#lib/helpers/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import GuideSettings from './GuideSettings.svelte';
	import OutlineVersions from './OutlineVersions.svelte';
	import { getOutlineDraft } from './outlineDraft.svelte';
	import type { PageProps } from './$types';

	/** The structure tab with no page open: the guide's switches and the sidebar's versions. */
	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);
	const draft = getOutlineDraft();

	const [stored, access] = $derived(
		await Promise.all([
			client.liveQuery.guideOutlineOf({
				__args: { conferenceId },
				publishedAt: true,
				versions: { number: true, createdAt: true }
			}),
			fetchTeamAccess(conferenceId)
		])
	);

	async function restore(versionId: string) {
		if (!(await confirmDialog({ text: m.guideRestoreConfirm() }))) return;
		if (!(await draft.flush())) return;
		const promise = Promise.resolve(
			client.mutate.restoreGuideOutlineVersion({ __args: { conferenceId, versionId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await draft.loadStored();
	}

	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="flex w-full flex-col gap-4">
	<div class="alert alert-info alert-soft" role="status">
		<i class="ph-duotone ph-tree-structure text-xl" aria-hidden="true"></i>
		<span>{m.guideStructureHint()}</span>
	</div>

	<GuideSettings {conferenceId} canChangeSeries={canEditConference(access)} />

	<section class="flex flex-col gap-2" aria-labelledby="guide-sidebar-versions">
		<h2 id="guide-sidebar-versions" class="text-lg font-semibold">{m.guideTeamSidebar()}</h2>
		<p class="text-sm opacity-70">
			{stored?.publishedAt
				? m.guideSidebarPublishedAt({ date: dateTime(stored.publishedAt) })
				: m.guideSidebarNeverPublished()}
		</p>
		<OutlineVersions versions={stored?.versions ?? []} onRestore={restore} />
	</section>
</div>
