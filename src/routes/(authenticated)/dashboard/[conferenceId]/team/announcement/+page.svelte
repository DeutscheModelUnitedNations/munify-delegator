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
	import { roleLabel, STATE_LOOK, STATE_ORDER, type AudienceLookups } from './announcementLabels';
	import { rowView, type RowAction } from './announcementRowView';
	import FilterChips from '#lib/components/FilterChips.svelte';
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
	// compact and of one width in every row, so the column lines up
	const shortDate = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: conference.timezone
		});
	/** What each row shows, worked out in `announcementRowView`. */
	const views = $derived(rows.map((row) => rowView({ row, lookups, dateTime, shortDate })));
	type RowView = ReturnType<typeof rowView>;

	let stateFilter = $state<string | null>(null);
	const stateCounts = $derived(
		views.reduce(
			(counts, view) => counts.set(view.state, (counts.get(view.state) ?? 0) + 1),
			new Map<string, number>()
		)
	);
	// only the states some announcement is in, in the order they pass through
	const stateOptions = $derived(
		STATE_ORDER.filter((state) => stateCounts.has(state)).map((state) => ({ key: state, state }))
	);
	const shownViews = $derived(
		stateFilter && stateCounts.has(stateFilter)
			? views.filter((view) => view.state === stateFilter)
			: views
	);

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

	// a click anywhere on a row edits it, but not one meant for its own buttons or one that ends
	// selecting text; keyboards reach the editor through the title's button
	function onRowClick(event: MouseEvent, id: string) {
		if (!(event.target instanceof Element)) return;
		if (event.target.closest('button, a, .dropdown')) return;
		if (window.getSelection()?.toString()) return;
		act('edit', id);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<p class="text-base-content/70 min-w-0 flex-1 text-sm">{m.announcementTeamDescription()}</p>
		<button
			class="btn btn-primary"
			onclick={() => edit()}
			data-testid="announcement-new"
			data-tour="team.announcement.new"
		>
			<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			{m.announcementCreate()}
		</button>
	</div>

	{#if rows.length === 0}
		<div
			class="bg-base-200 text-base-content/70 flex flex-col items-center gap-3 rounded-box p-10 text-center"
			data-testid="announcement-list-empty"
		>
			<i aria-hidden="true" class="ph-duotone ph-megaphone text-primary text-5xl"></i>
			<p class="max-w-sm">{m.announcementListEmpty()}</p>
		</div>
	{:else if stateOptions.length > 1}
		<FilterChips
			options={stateOptions}
			selected={stateFilter}
			onSelect={(key) => (stateFilter = key)}
			label={m.announcementFilterByState()}
		>
			{#snippet chip(option)}
				{STATE_LOOK[option.state].label()}
				<span class="opacity-60">{stateCounts.get(option.state)}</span>
			{/snippet}
		</FilterChips>
	{/if}

	{#if shownViews.length > 0}
		<!-- the columns' names, for the eye; every cell also says in full what it holds -->
		<div
			class="announcement-grid text-base-content/60 px-5 text-xs font-semibold tracking-wide uppercase max-lg:hidden"
			aria-hidden="true"
		>
			<span>{m.announcementColumnAnnouncement()}</span>
			<span>{m.announcementColumnState()}</span>
			<span>{m.announcementColumnWhen()}</span>
			<span>{m.announcementColumnReach()}</span>
			<span>{m.announcementColumnAuthor()}</span>
			<span></span>
		</div>
	{/if}

	<!-- the rows are drawn here, in snippets, not as a component of their own (see `rowView`) -->
	<ul
		class="flex flex-col gap-2"
		data-testid="announcement-list"
		data-tour="team.announcement.list"
	>
		{#each shownViews as view (view.id)}
			{@const look = STATE_LOOK[view.state]}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
			<li
				class={[
					'announcement-grid bg-base-200 hover:bg-base-300/60 rounded-box flex cursor-pointer flex-col gap-3 border-l-4 px-4 py-3 transition-colors',
					look.edge,
					view.state === 'ARCHIVED' && 'opacity-70'
				]}
				onclick={(event) => onRowClick(event, view.id)}
				data-testid="announcement-row"
				data-state={view.state}
			>
				{@render titleCell(view)}

				<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm lg:contents">
					<span>
						<span class="badge badge-sm gap-1 {look.badge}" data-testid="announcement-state">
							<i aria-hidden="true" class="ph-duotone {look.icon}"></i>
							{look.label()}
						</span>
					</span>
					{@render whenCell(view)}
					{@render reachCell(view)}
					{@render authorCell(view)}
				</div>

				{@render rowButtons(view)}
			</li>
		{/each}
	</ul>
</div>

{#snippet titleCell(view: RowView)}
	<div class="flex min-w-0 flex-col gap-1.5">
		<div class="flex min-w-0 items-center gap-2">
			<h2 class="min-w-0 truncate font-semibold" title={view.title}>
				<button
					type="button"
					class="hover:text-primary focus-visible:text-primary cursor-pointer text-left"
					onclick={() => act('edit', view.id)}
					data-testid="announcement-edit">{view.title}</button
				>
			</h2>
			{#each view.badges as badge (badge.key)}
				<span class={['shrink-0 text-base', badge.tone]} title={badge.label}>
					<i aria-hidden="true" class={badge.icon}></i>
					<span class="sr-only">{badge.label}</span>
				</span>
			{/each}
		</div>
		<ul class="flex flex-wrap gap-1" aria-label={m.announcementAudience()}>
			{#each view.audiences as audience (audience.id)}
				<li class="badge badge-primary badge-soft badge-sm">{audience.label}</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet whenCell(view: RowView)}
	<span class="flex flex-col gap-0.5 tabular-nums" title={view.facts.publishAt}>
		{#if view.cells.when}
			<span class="flex items-center gap-1.5" aria-hidden="true">
				<i
					aria-hidden="true"
					class="ph-duotone {view.state === 'SCHEDULED'
						? 'ph-calendar-dots'
						: 'ph-calendar-check'} text-base-content/60"
				></i>
				{view.cells.when}
				{#if view.cells.edited}
					<i
						aria-hidden="true"
						class="ph-duotone ph-pencil-simple text-base-content/60"
						title={view.facts.editedAt}
					></i>
				{/if}
			</span>
			{#if view.cells.until}
				<span
					class="text-base-content/60 flex items-center gap-1.5 text-xs"
					title={view.facts.visibleUntil}
					aria-hidden="true"
				>
					<i aria-hidden="true" class="ph-duotone ph-hourglass-medium"></i>
					{view.cells.until}
				</span>
			{/if}
		{:else}
			<span class="text-base-content/40" aria-hidden="true">–</span>
		{/if}
		{@render spokenFacts(view.facts, ['publishAt', 'visibleUntil', 'editedAt'])}
	</span>
{/snippet}

{#snippet reachCell(view: RowView)}
	<span class="flex flex-col gap-1 tabular-nums" title={view.facts.reach}>
		<span class="flex items-center gap-1.5" aria-hidden="true">
			{#if view.cells.reach.read !== null}
				<i aria-hidden="true" class="ph-duotone ph-eye text-base-content/60"></i>
				{view.cells.reach.read} / {view.cells.reach.total}
			{:else}
				<i aria-hidden="true" class="ph-duotone ph-users-three text-base-content/60"></i>
				{view.cells.reach.total}
			{/if}
		</span>
		{#if view.cells.reach.share !== null}
			<progress
				class="progress progress-success h-1 w-24"
				value={view.cells.reach.share}
				max="1"
				aria-hidden="true"
			></progress>
		{/if}
		<span class="sr-only" data-testid="announcement-reach">{view.facts.reach}</span>
	</span>
{/snippet}

{#snippet authorCell(view: RowView)}
	<span
		class="flex min-w-0 items-center gap-1.5"
		title={[view.facts.author, view.facts.publishedBy].filter(Boolean).join(' · ')}
	>
		<i aria-hidden="true" class="ph-duotone ph-user-circle text-base-content/60"></i>
		<span class="truncate" aria-hidden="true">{view.cells.author ?? '–'}</span>
		{@render spokenFacts(view.facts, ['author', 'publishedBy'])}
	</span>
{/snippet}

{#snippet rowButtons(view: RowView)}
	<div
		class="flex items-center justify-end gap-1 max-lg:-mt-1"
		data-tour="team.announcement.row-actions"
	>
		{#each view.inline as button (button.action)}
			<button
				class={['btn btn-sm btn-square', button.look || 'btn-ghost']}
				title={button.label}
				aria-label={button.label}
				onclick={() => act(button.action, view.id)}
				data-testid="announcement-{button.action}"
			>
				<i aria-hidden="true" class="ph-duotone {button.icon} text-lg"></i>
			</button>
		{/each}
		<div class="dropdown dropdown-end">
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-square"
				title={m.announcementMoreActions({ title: view.title })}
				aria-label={m.announcementMoreActions({ title: view.title })}
				data-testid="announcement-more"
			>
				<i aria-hidden="true" class="ph-duotone ph-dots-three-vertical text-lg"></i>
			</button>
			<ul
				class="menu dropdown-content bg-base-100 rounded-box border-base-300 z-10 w-56 border p-2 shadow-lg"
			>
				{#each view.more as button (button.action)}
					<li>
						<button
							type="button"
							class={button.action === 'delete' ? 'text-error' : ''}
							onclick={(event) => {
								event.currentTarget.blur();
								act(button.action, view.id);
							}}
							data-testid="announcement-{button.action}"
						>
							<i aria-hidden="true" class="ph-duotone {button.icon}"></i>
							{button.label}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/snippet}

<!-- the cells' sentences for screen readers; the eye reads the compact cells -->
{#snippet spokenFacts(facts: Record<string, string>, keys: string[])}
	{#each keys as key (key)}
		{#if facts[key]}
			<span class="sr-only" data-testid="announcement-{key}">{facts[key]}</span>
		{/if}
	{/each}
{/snippet}

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

<style>
	/* Every row is a grid of the same columns, so dates, counts and names line up from row to row. */
	@media (width >= 64rem) {
		.announcement-grid {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 8.5rem 9rem 8rem 10rem 7.5rem;
			align-items: center;
			column-gap: 1rem;
		}
	}
</style>
