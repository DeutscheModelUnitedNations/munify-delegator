<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { conflictAwareToastMessages } from '#lib/utils/toast';
	import AnnouncementEditor from './AnnouncementEditor.svelte';
	import PublishDialog from './PublishDialog.svelte';
	import { fetchAnnouncements, type AnnouncementRow as Row } from './announcementRows';
	import AnnouncementRow from './AnnouncementRow.svelte';
	import { roleLabel, type AudienceLookups } from './announcementLabels';
	import type { RowAction } from './announcementRowView';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);

	const [announcements, conference, committees, roles, surveys] = $derived(
		await Promise.all([
			fetchAnnouncements(conferenceId),
			client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true }),
			client.liveQuery.committees({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				abbreviation: true,
				name: true
			}),
			client.liveQuery.conferenceRoles({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				name: true,
				nationAlpha3Code: true
			}),
			client.liveQuery.surveyQuestions({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				title: true,
				options: { title: true }
			})
		])
	);

	const lookups = $derived<AudienceLookups>({
		committees: new Map(
			committees.map((committee) => [committee.id, `${committee.abbreviation} · ${committee.name}`])
		),
		roles: new Map(
			roles
				.map((role) => [role.id, roleLabel(role)] as const)
				.toSorted((a, b) => a[1].localeCompare(b[1], getLocale()))
		),
		surveyOptions: new Map(
			surveys.flatMap((survey) =>
				survey.options.map((option) => [option.id, `${survey.title}: ${option.title}`] as const)
			)
		)
	});

	const rows = $derived(announcements.slice());

	let editorOpen = $state(false);
	let editing = $state<Row>();
	let publishOpen = $state(false);
	let publishing = $state<Row>();

	function edit(row?: Row) {
		editing = row;
		editorOpen = true;
	}

	function publish(row: Row) {
		publishing = row;
		publishOpen = true;
	}

	/** Runs a mutation with a toast that shows the server's reason when it refuses. */
	function run(promise: Promise<unknown>, success?: string) {
		toast.promise(promise, {
			...conflictAwareToastMessages,
			...(success ? { success } : {})
		});
	}

	const withdraw = (row: Row, archive: boolean) =>
		run(client.mutate.withdrawAnnouncement({ __args: { id: row.id, archive }, state: true }));
	const duplicate = (row: Row) =>
		run(client.mutate.duplicateAnnouncement({ __args: { id: row.id }, state: true }));
	const renotify = (row: Row) => {
		if (!confirm(m.announcementRenotifyConfirm({ count: row.recipientCount }))) return;
		run(
			Promise.resolve(client.mutate.renotifyAnnouncement({ __args: { id: row.id } })),
			m.announcementRenotified()
		);
	};
	const testMail = (row: Row) =>
		run(
			Promise.resolve(client.mutate.sendAnnouncementTestMail({ __args: { id: row.id } })),
			m.announcementTestMailSent()
		);
	const remove = (row: Row) => {
		if (!confirm(m.announcementDeleteConfirm({ title: row.title }))) return;
		run(Promise.resolve(client.mutate.deleteAnnouncement({ __args: { id: row.id } })));
	};

	const ACTIONS: Record<RowAction, (row: Row) => void> = {
		edit,
		publish,
		withdraw: (row) => withdraw(row, false),
		renotify,
		'test-mail': testMail,
		duplicate,
		archive: (row) => withdraw(row, true),
		delete: remove
	};
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<p class="min-w-0 flex-1 opacity-70">{m.announcementTeamDescription()}</p>
		<button class="btn btn-primary" onclick={() => edit()} data-testid="announcement-new">
			<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			{m.announcementCreate()}
		</button>
	</div>

	{#if rows.length === 0}
		<div class="alert" data-testid="announcement-list-empty">
			<i aria-hidden="true" class="ph-duotone ph-megaphone"></i>
			<span>{m.announcementListEmpty()}</span>
		</div>
	{/if}

	<ul class="flex flex-col gap-3" data-testid="announcement-list">
		{#each rows as row (row.id)}
			<AnnouncementRow
				{row}
				{lookups}
				timezone={conference.timezone}
				onAction={(action) => ACTIONS[action](row)}
			/>
		{/each}
	</ul>
</div>

{#if editorOpen}
	<!-- keyed, so each opening seeds a fresh form -->
	{#key editing?.id}
		<AnnouncementEditor
			bind:open={editorOpen}
			{conferenceId}
			timezone={conference.timezone}
			{lookups}
			announcement={editing}
		/>
	{/key}
{/if}

{#if publishing && publishOpen}
	<PublishDialog bind:open={publishOpen} announcement={publishing} timezone={conference.timezone} />
{/if}
