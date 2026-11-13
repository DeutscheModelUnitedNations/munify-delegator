<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import formatNames from '#lib/helpers/formatNames';
	import { conflictAwareToastMessages } from '#lib/utils/toast';
	import AnnouncementEditor from './AnnouncementEditor.svelte';
	import PublishDialog from './PublishDialog.svelte';
	import { fetchAnnouncements, type AnnouncementRow } from './announcementRows';
	import {
		audienceLabel,
		isAnnouncementState,
		roleLabel,
		STATE_LOOK,
		type AudienceLookups
	} from './announcementLabels';
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
	const stateOf = (row: AnnouncementRow) => (isAnnouncementState(row.state) ? row.state : 'DRAFT');

	let editorOpen = $state(false);
	let editing = $state<AnnouncementRow>();
	let publishOpen = $state(false);
	let publishing = $state<AnnouncementRow>();

	function edit(row?: AnnouncementRow) {
		editing = row;
		editorOpen = true;
	}

	function publish(row: AnnouncementRow) {
		publishing = row;
		publishOpen = true;
	}

	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: conference.timezone
		});

	const nameOf = (user: { givenName: string; familyName: string } | null | undefined) =>
		user
			? formatNames({
					givenName: user.givenName,
					familyName: user.familyName,
					options: { givenNameUppercase: false, familyNameUppercase: false }
				})
			: undefined;

	/** Runs a mutation with a toast that shows the server's reason when it refuses. */
	function run(promise: Promise<unknown>, success?: string) {
		toast.promise(promise, {
			...conflictAwareToastMessages,
			...(success ? { success } : {})
		});
	}

	const withdraw = (row: AnnouncementRow, archive: boolean) =>
		run(client.mutate.withdrawAnnouncement({ __args: { id: row.id, archive }, state: true }));
	const duplicate = (row: AnnouncementRow) =>
		run(client.mutate.duplicateAnnouncement({ __args: { id: row.id }, state: true }));
	const renotify = (row: AnnouncementRow) => {
		if (!confirm(m.announcementRenotifyConfirm({ count: row.recipientCount }))) return;
		run(
			Promise.resolve(client.mutate.renotifyAnnouncement({ __args: { id: row.id } })),
			m.announcementRenotified()
		);
	};
	const testMail = (row: AnnouncementRow) =>
		run(
			Promise.resolve(client.mutate.sendAnnouncementTestMail({ __args: { id: row.id } })),
			m.announcementTestMailSent()
		);
	const remove = (row: AnnouncementRow) => {
		if (!confirm(m.announcementDeleteConfirm({ title: row.title }))) return;
		run(Promise.resolve(client.mutate.deleteAnnouncement({ __args: { id: row.id } })));
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
			{@const state = stateOf(row)}
			{@const look = STATE_LOOK[state]}
			<li
				class="bg-base-100 border-base-300 rounded-box flex flex-col gap-3 border p-4"
				data-testid="announcement-row"
				data-state={state}
			>
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="min-w-0 flex-1 text-lg font-semibold break-words">{row.title}</h2>
					<span class="badge {look.badge}" data-testid="announcement-state">{look.label()}</span>
					{#if row.importance === 'URGENT'}
						<span class="badge badge-error">{m.announcementImportanceUrgent()}</span>
					{:else if row.importance === 'IMPORTANT'}
						<span class="badge badge-warning">{m.announcementImportanceImportant()}</span>
					{/if}
					{#if row.pinned}
						<span class="badge badge-ghost gap-1">
							<i aria-hidden="true" class="ph-fill ph-push-pin"></i>
							{m.announcementPinned()}
						</span>
					{/if}
					{#if row.notifyByMail}
						<span class="badge badge-ghost gap-1">
							<i aria-hidden="true" class="ph-duotone ph-envelope"></i>
							{m.announcementWithMail()}
						</span>
					{/if}
				</div>

				<ul class="flex flex-wrap gap-1.5" aria-label={m.announcementAudience()}>
					{#each row.audiences as audience (audience.id)}
						<li class="badge badge-primary badge-soft badge-sm">
							{audienceLabel({ audience, lookups })}
						</li>
					{/each}
				</ul>

				<p class="text-base-content/70 flex flex-wrap gap-x-4 gap-y-1 text-sm">
					{#if state === 'SCHEDULED' && row.publishAt}
						<span>{m.announcementScheduledFor({ date: dateTime(row.publishAt) })}</span>
					{:else if row.publishAt}
						<span>{m.announcementPublishedAt({ date: dateTime(row.publishAt) })}</span>
					{/if}
					{#if row.visibleUntil}
						<span>{m.announcementVisibleUntilDate({ date: dateTime(row.visibleUntil) })}</span>
					{/if}
					{#if row.editedAt}
						<span>{m.announcementEditedAt({ date: dateTime(row.editedAt) })}</span>
					{/if}
					<span data-testid="announcement-reach">
						{state === 'PUBLISHED' || state === 'EXPIRED'
							? m.announcementReadBy({ read: row.readCount, total: row.recipientCount })
							: m.announcementAudienceReaches({ count: row.recipientCount })}
					</span>
					{#if nameOf(row.author)}
						<span>{m.announcementWrittenBy({ name: nameOf(row.author) ?? '' })}</span>
					{/if}
					{#if nameOf(row.publishedBy) && state !== 'DRAFT'}
						<span>{m.announcementPublishedBy({ name: nameOf(row.publishedBy) ?? '' })}</span>
					{/if}
				</p>

				<div class="flex flex-wrap gap-2">
					<button class="btn btn-sm" onclick={() => edit(row)} data-testid="announcement-edit">
						<i aria-hidden="true" class="ph-duotone ph-pen"></i>
						{m.edit()}
					</button>
					{#if state === 'DRAFT' || state === 'ARCHIVED'}
						<button
							class="btn btn-sm btn-primary"
							onclick={() => publish(row)}
							data-testid="announcement-publish"
						>
							<i aria-hidden="true" class="ph-duotone ph-megaphone"></i>
							{m.announcementPublish()}
						</button>
					{:else}
						<button
							class="btn btn-sm"
							onclick={() => withdraw(row, false)}
							data-testid="announcement-withdraw"
						>
							<i aria-hidden="true" class="ph-duotone ph-arrow-u-up-left"></i>
							{m.announcementWithdraw()}
						</button>
					{/if}
					{#if state === 'PUBLISHED' && row.notifyByMail}
						<button class="btn btn-sm" onclick={() => renotify(row)}>
							<i aria-hidden="true" class="ph-duotone ph-envelope"></i>
							{m.announcementRenotify()}
						</button>
					{/if}
					<button
						class="btn btn-sm"
						onclick={() => testMail(row)}
						data-testid="announcement-test-mail"
					>
						<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
						{m.announcementTestMail()}
					</button>
					<button
						class="btn btn-sm"
						onclick={() => duplicate(row)}
						data-testid="announcement-duplicate"
					>
						<i aria-hidden="true" class="ph-duotone ph-copy"></i>
						{m.announcementDuplicate()}
					</button>
					{#if state !== 'ARCHIVED'}
						<button
							class="btn btn-sm"
							onclick={() => withdraw(row, true)}
							data-testid="announcement-archive"
						>
							<i aria-hidden="true" class="ph-duotone ph-archive"></i>
							{m.announcementArchive()}
						</button>
					{/if}
					<button
						class="btn btn-sm btn-ghost text-error"
						onclick={() => remove(row)}
						data-testid="announcement-delete"
					>
						<i aria-hidden="true" class="ph-duotone ph-trash"></i>
						{m.delete()}
					</button>
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

{#if publishing && publishOpen}
	<PublishDialog bind:open={publishOpen} announcement={publishing} timezone={conference.timezone} />
{/if}
