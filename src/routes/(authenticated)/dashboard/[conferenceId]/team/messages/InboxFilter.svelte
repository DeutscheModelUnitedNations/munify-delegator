<!--
	@component
	Narrows the team's chat list to some of its inboxes in two short rows instead of a chip per
	inbox: first the kind (participant care, chairs, consultants, trusted persons), then, for a kind
	of several inboxes, which one (the committee, or the trusted persons' shared or own). Who
	answers inboxes of one kind only gets the second row alone.
-->
<script lang="ts">
	import { inboxName, INBOX_ICON } from '#lib/components/chat/chatLabels';
	import { m } from '#lib/paraglide/messages';
	import {
		inboxFilterRows,
		teamInboxName,
		type InboxGroup,
		type InboxKind,
		type TeamInbox
	} from './teamInboxes';

	/** A button of the filter (`inboxFilterRows`). */
	type FilterOption = NonNullable<ReturnType<typeof inboxFilterRows>['members']>['all'];

	interface Props {
		groups: readonly InboxGroup[];
		/** The filter key the list is narrowed to (an inbox's or a group's); null for all */
		selected: string | null;
		onSelect: (key: string | null) => void;
		/** How much of each inbox is unread, by its key */
		unreadOf: ReadonlyMap<string, number>;
	}

	let { groups, selected, onSelect, unreadOf }: Props = $props();

	const rows = $derived(inboxFilterRows({ groups, selected, unreadOf }));
	const membersLabel = $derived(
		rows.kinds && rows.members ? groupLabel(rows.members.group.kind) : m.chatFilterByInbox()
	);

	function groupLabel(kind: InboxKind) {
		if (kind === 'PARTICIPANT_CARE') return m.chatInboxGroupCare();
		if (kind === 'TRUSTED_PERSON') return m.chatInboxTrustedPersons();
		if (kind === 'GROUP') return m.chatGroups();
		if (kind === 'ROLE_SUPPORT') return m.chatInboxRoleSupportKind();
		return inboxName({ inbox: kind });
	}
	const groupIcon = (kind: InboxKind) => (kind === 'GROUP' ? 'users-four' : INBOX_ICON[kind]);
	const groupTitle = (kind: InboxKind) =>
		kind === 'PARTICIPANT_CARE' ? m.chatInboxParticipantCare() : undefined;
	const memberLabel = (inbox: TeamInbox) =>
		inbox.committeeAbbreviation ??
		inbox.roleName ??
		(inbox.own ? m.chatInboxTrustedOwn() : m.chatInboxTrustedPersons());
	const memberTitle = (inbox: TeamInbox) =>
		inbox.committeeAbbreviation || inbox.roleName ? teamInboxName(inbox) : undefined;

	const segment = (pressed: boolean) => [
		'btn btn-xs h-7 flex-1 gap-1 border-0 px-2 font-medium',
		pressed
			? 'bg-base-100 text-base-content shadow-sm'
			: 'btn-ghost text-base-content/70 shadow-none'
	];
	const chip = (pressed: boolean) => [
		'btn btn-xs font-medium',
		pressed ? 'btn-primary' : 'btn-ghost bg-base-content/5 hover:bg-base-content/10'
	];
</script>

{#snippet unreadBadge(count: number)}
	{#if count > 0}
		<span class="badge badge-primary badge-xs">
			<span aria-hidden="true">{count}</span>
			<span class="sr-only">{m.chatUnreadCount({ count })}</span>
		</span>
	{/if}
{/snippet}

{#snippet option({
	option,
	classes,
	label,
	icon,
	title
}: {
	option: FilterOption;
	classes: (pressed: boolean) => string[];
	label: string;
	icon?: string;
	title?: string;
})}
	<button
		type="button"
		class={classes(option.pressed)}
		aria-pressed={option.pressed}
		{title}
		onclick={() => onSelect(option.target)}
	>
		{#if icon}<i aria-hidden="true" class="ph-duotone ph-{icon}"></i>{/if}
		{label}
		{@render unreadBadge(option.unread)}
	</button>
{/snippet}

<div class="flex flex-col gap-1.5" data-testid="inbox-filter" data-tour="team.messages.inboxes">
	{#if rows.kinds}
		<div
			class="bg-base-content/5 flex flex-wrap gap-0.5 rounded-field p-0.5"
			role="group"
			aria-label={m.chatFilterByInbox()}
		>
			{@render option({ option: rows.kinds.all, classes: segment, label: m.all() })}
			{#each rows.kinds.groups as kind (kind.group.key)}
				{@render option({
					option: kind,
					classes: segment,
					label: groupLabel(kind.group.kind),
					icon: groupIcon(kind.group.kind),
					title: groupTitle(kind.group.kind)
				})}
			{/each}
		</div>
	{/if}
	{#if rows.members}
		<div class="flex flex-wrap gap-1" role="group" aria-label={membersLabel}>
			{@render option({ option: rows.members.all, classes: chip, label: m.all() })}
			{#each rows.members.inboxes as member (member.inbox.key)}
				{@render option({
					option: member,
					classes: chip,
					label: memberLabel(member.inbox),
					title: memberTitle(member.inbox)
				})}
			{/each}
		</div>
	{/if}
</div>
