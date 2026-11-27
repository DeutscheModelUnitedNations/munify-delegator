<!--
	@component
	What the conference last told its participants and what it still owes them: the latest
	published announcement and how many of its audience read it (for whoever opens the
	announcements), and the mails due per kind, sent on their own or by hand (for whoever sends the
	mails). Live, apart from the mails, which the API works out on asking.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client, type EmailkindEnum } from '#lib/api/rumbleClient/client';
	import { fetchOpenEmails } from '#lib/api/openEmails';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import WidgetMeter from '#lib/components/dashboard/WidgetMeter.svelte';
	import { EMAIL_GROUPS, isAlwaysSent } from '#lib/helpers/emailKinds';
	import { emailKindTexts } from '#lib/helpers/emailKindTexts';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';
	import { waitedFor } from './waited';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	/** Every kind the team sends, apart from those that go out where they happen */
	const SENT_KINDS: EmailkindEnum[] = EMAIL_GROUPS.flatMap((group) => group.kinds).filter(
		(kind) => !isAlwaysSent(kind)
	);

	const clock = createMinuteClock();
	const seesAnnouncements = $derived(mayOpen({ routeId: 'announcement', access }));
	const seesEmails = $derived(mayOpen({ routeId: 'emails', access }));

	const [announcements, emails] = $derived(
		await Promise.all([
			seesAnnouncements
				? client.liveQuery.announcements({
						__args: {
							where: { conferenceId: { eq: conferenceId }, status: 'PUBLISHED' },
							orderBy: { publishAt: 'desc' },
							limit: 1
						},
						title: true,
						publishAt: true,
						readCount: true,
						recipientCount: true
					})
				: [],
			seesEmails ? fetchOpenEmails({ conferenceId, kinds: SENT_KINDS }) : []
		])
	);

	const latest = $derived(announcements[0]);
	const owed = $derived(
		emails.toSorted((a, b) => b.open - a.open).slice(0, size === 'large' ? 4 : 3)
	);
	const now = $derived(new Date(clock.time));
	const number = (n: number) => n.toLocaleString(getLocale());
</script>

<DashboardWidget
	icon="megaphone"
	title={m.teamWidgetCommunicationTitle()}
	{size}
	testId="communication"
	href={seesEmails
		? resolve('/(authenticated)/dashboard/[conferenceId]/team/emails', { conferenceId })
		: resolve('/(authenticated)/dashboard/[conferenceId]/team/announcement', { conferenceId })}
	linkLabel={seesEmails ? m.teamWidgetCommunicationEmailsLink() : m.teamWidgetCommunicationLink()}
	empty={!latest && owed.length === 0 ? m.teamWidgetCommunicationEmpty() : undefined}
>
	<div class="grid gap-4 {size === 'large' && latest && owed.length > 0 ? 'md:grid-cols-2' : ''}">
		{#if latest}
			<div class="flex flex-col gap-2">
				<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide">
					{latest.publishAt
						? m.teamWidgetCommunicationLatestAgo({
								duration: waitedFor({ since: new Date(latest.publishAt), now })
							})
						: m.teamWidgetCommunicationLatest()}
				</span>
				<a
					class="link link-hover font-semibold"
					href={resolve('/(authenticated)/dashboard/[conferenceId]/team/announcement', {
						conferenceId
					})}>{latest.title}</a
				>
				<WidgetMeter
					label={m.teamWidgetCommunicationRead()}
					value={latest.readCount}
					max={latest.recipientCount}
				/>
			</div>
		{/if}
		{#if owed.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide"
					>{m.teamWidgetCommunicationOwed()}</span
				>
				<ul class="flex flex-col gap-1.5">
					{#each owed as mail (mail.kind)}
						<li class="flex justify-between gap-3">
							<span class="min-w-0 truncate">{emailKindTexts(mail.kind).title}</span>
							<span class="text-base-content/70 shrink-0 text-sm tabular-nums">
								{m.teamWidgetCommunicationRecipients({ count: number(mail.open) })} ·
								{mail.automatic
									? m.teamWidgetCommunicationAutomatic()
									: m.teamWidgetCommunicationManual()}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</DashboardWidget>
