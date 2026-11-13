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
	import { roleLabel, STATE_LOOK, type AudienceLookups } from './announcementLabels';
	import { rowView, type RowAction } from './announcementRowView';
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
	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: conference.timezone
		});
	/** What each row shows, worked out in `announcementRowView`. */
	const views = $derived(rows.map((row) => rowView({ row, lookups, dateTime })));

	let editorOpen = $state(false);
	let editing = $state<Row>();
	let publishOpen = $state(false);
	let publishing = $state<Row>();

	/** The announcement the publish dialog is open for. */
	const toPublish = $derived(publishOpen ? publishing : undefined);

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

	function act(action: RowAction, id: string) {
		const row = rows.find((other) => other.id === id);
		if (row) ACTIONS[action](row);
	}
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
		{#each views as view (view.id)}
			<li
				class="bg-base-100 border-base-300 rounded-box flex flex-col gap-3 border p-4"
				data-testid="announcement-row"
				data-state={view.state}
			>
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="min-w-0 flex-1 text-lg font-semibold break-words">{view.title}</h2>
					<span class="badge {STATE_LOOK[view.state].badge}" data-testid="announcement-state"
						>{STATE_LOOK[view.state].label()}</span
					>
					{#each view.badges as badge (badge.key)}
						<span class="badge {badge.look}">
							<i aria-hidden="true" class={badge.icon}></i>
							{badge.label}
						</span>
					{/each}
				</div>

				<ul class="flex flex-wrap gap-1.5" aria-label={m.announcementAudience()}>
					{#each view.audiences as audience (audience.id)}
						<li class="badge badge-primary badge-soft badge-sm">{audience.label}</li>
					{/each}
				</ul>

				<p class="text-base-content/70 flex flex-wrap gap-x-4 gap-y-1 text-sm">
					{#each view.facts as fact (fact.key)}
						<span data-testid="announcement-{fact.key}">{fact.text}</span>
					{/each}
				</p>

				<div class="flex flex-wrap gap-2">
					{#each view.actions as button (button.action)}
						<button
							class="btn btn-sm {button.look}"
							onclick={() => act(button.action, view.id)}
							data-testid="announcement-{button.action}"
						>
							<i aria-hidden="true" class="ph-duotone {button.icon}"></i>
							{button.label}
						</button>
					{/each}
				</div>
			</li>
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

{#if toPublish}
	<PublishDialog bind:open={publishOpen} announcement={toPublish} timezone={conference.timezone} />
{/if}
