<!--
	@component
	One conference's rows of the notification matrix: its heading with the buttons switching all of
	it and whether Slack reaches the caller there, then a line per topic with both channels.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
	import type { NotificationTopic } from '#lib/helpers/teamNotifications';
	import NotificationAllButtons from './NotificationAllButtons.svelte';
	import NotificationChannelCell from './NotificationChannelCell.svelte';
	import SlackConnectionNote from './SlackConnectionNote.svelte';

	interface Setting {
		id: string;
		topic: NotificationTopic;
		teamFunctionId?: string | null;
		functionKind?: string | null;
		committeeAbbreviation?: string | null;
		committeeName?: string | null;
		roleName?: string | null;
		email: boolean;
		slack: boolean;
	}

	interface Props {
		conference: {
			conferenceId: string;
			conferenceTitle: string;
			slackWorkspaceName?: string | null;
			settings: Setting[];
		};
		/** A switch of everything is underway. */
		busy: boolean;
		onsetall: (enabled: boolean) => void;
	}

	let { conference, busy, onsetall }: Props = $props();

	const rowKey = (setting: Setting) => `${setting.topic}:${setting.teamFunctionId ?? ''}`;
	const keyOf = (setting: Setting) => ({
		topic: setting.topic,
		teamFunctionId: setting.teamFunctionId ?? null
	});
	const slackTestUnavailable = $derived(
		conference.slackWorkspaceName ? undefined : m.notificationsTestNoWorkspace()
	);
</script>

<tbody data-testid="notifications-conference">
	<tr class="bg-base-200/60">
		<th colspan="3" scope="rowgroup" class="font-normal">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="text-base-content text-base font-bold">
					{conference.conferenceTitle}
				</span>
				{#if conference.settings.length > 0}
					<NotificationAllButtons
						settings={conference.settings}
						enableLabel={m.notificationsEnableAllOf({ conference: conference.conferenceTitle })}
						disableLabel={m.notificationsDisableAllOf({ conference: conference.conferenceTitle })}
						{busy}
						onset={onsetall}
					/>
				{/if}
			</div>
			<svelte:boundary>
				<SlackConnectionNote
					conferenceId={conference.conferenceId}
					workspaceName={conference.slackWorkspaceName ?? null}
				/>
				{#snippet pending()}
					<div class="skeleton mt-1 h-4 w-2/3"></div>
				{/snippet}
			</svelte:boundary>
		</th>
	</tr>
	{#each conference.settings as setting (setting.id)}
		{@const label = notificationTopicLabel(setting)}
		<tr data-testid="notification-row" data-topic={rowKey(setting)}>
			<th scope="row" class="pl-8 font-normal">
				<span class="font-medium">{label}</span>
				{#if setting.committeeName}
					<span class="text-base-content/70 block text-xs">
						{setting.committeeName}
					</span>
				{/if}
			</th>
			<NotificationChannelCell
				conferenceId={conference.conferenceId}
				key={keyOf(setting)}
				channel="EMAIL"
				{label}
				checked={setting.email}
			/>
			<NotificationChannelCell
				conferenceId={conference.conferenceId}
				key={keyOf(setting)}
				channel="SLACK"
				{label}
				checked={setting.slack}
				testUnavailable={slackTestUnavailable}
			/>
		</tr>
	{:else}
		<tr>
			<td colspan="3" class="text-base-content/70 pl-8 text-sm">
				{m.notificationsNoTopics()}
			</td>
		</tr>
	{/each}
</tbody>
