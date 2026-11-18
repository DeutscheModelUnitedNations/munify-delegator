<!--
	@component
	A member's notification lines in one conference: per topic a switch and a test for mail and Slack.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
	import type { NotificationTopic } from '#lib/helpers/teamNotifications';
	import NotificationChannelCell from './NotificationChannelCell.svelte';

	interface Setting {
		id: string;
		topic: NotificationTopic;
		teamFunctionId?: string | null;
		functionKind?: string | null;
		committeeAbbreviation?: string | null;
		committeeName?: string | null;
		email: boolean;
		slack: boolean;
	}

	interface Props {
		conferenceId: string;
		hasSlackWorkspace: boolean;
		settings: readonly Setting[];
	}

	let { conferenceId, hasSlackWorkspace, settings }: Props = $props();

	const keyOf = (setting: Setting) => ({
		topic: setting.topic,
		teamFunctionId: setting.teamFunctionId ?? null
	});
	const rowKey = (setting: Setting) => `${setting.topic}:${setting.teamFunctionId ?? ''}`;
</script>

<div class="overflow-x-auto">
	<table class="table">
		<thead>
			<tr>
				<th scope="col">{m.notificationsTopic()}</th>
				<th scope="col" class="w-28 text-center">{m.notificationsChannelEmail()}</th>
				<th scope="col" class="w-28 text-center">{m.notificationsChannelSlack()}</th>
			</tr>
		</thead>
		<tbody>
			{#each settings as setting (setting.id)}
				{@const label = notificationTopicLabel(setting)}
				<tr data-testid="notification-row" data-topic={rowKey(setting)}>
					<th scope="row" class="font-normal">
						<span class="font-medium">{label}</span>
						{#if setting.committeeName}
							<span class="text-base-content/70 block text-xs">
								{setting.committeeName}
							</span>
						{/if}
					</th>
					<NotificationChannelCell
						{conferenceId}
						key={keyOf(setting)}
						channel="EMAIL"
						{label}
						checked={setting.email}
					/>
					<NotificationChannelCell
						{conferenceId}
						key={keyOf(setting)}
						channel="SLACK"
						{label}
						checked={setting.slack}
						testUnavailable={hasSlackWorkspace ? undefined : m.notificationsTestNoWorkspace()}
					/>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="text-base-content/70 text-xs">{m.notificationsTestNote()}</p>
