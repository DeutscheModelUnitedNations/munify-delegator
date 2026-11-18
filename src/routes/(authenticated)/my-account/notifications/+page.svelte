<script lang="ts">
	import { dev } from '$app/env';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
	import type { NotificationChannel, NotificationTopic } from '#lib/helpers/teamNotifications';
	import SlackConnectionNote from './SlackConnectionNote.svelte';

	/**
	 * The caller's notification settings: per conference they are on the team of, what mail and
	 * Slack tell them about. A switch saves right away; the list is live, so a function handed
	 * out or a workspace picked meanwhile shows up.
	 */

	const conferences = $derived(
		await client.liveQuery.myNotificationSettings({
			conferenceId: true,
			conferenceTitle: true,
			slackWorkspaceName: true,
			settings: {
				topic: true,
				teamFunctionId: true,
				functionKind: true,
				committeeAbbreviation: true,
				committeeName: true,
				email: true,
				slack: true
			}
		})
	);

	const rowKey = (setting: { topic: string; teamFunctionId?: string | null }) =>
		`${setting.topic}:${setting.teamFunctionId ?? ''}`;

	/** Saves a switch; one that could not be saved goes back to where it was. */
	async function setChannel({
		conferenceId,
		key,
		channel,
		input
	}: {
		conferenceId: string;
		key: { topic: NotificationTopic; teamFunctionId?: string | null };
		channel: NotificationChannel;
		input: HTMLInputElement;
	}) {
		const enabled = input.checked;
		try {
			await client.mutate.setNotificationPreference({
				__args: {
					conferenceId,
					topic: key.topic,
					teamFunctionId: key.teamFunctionId ?? null,
					channel,
					enabled
				}
			});
		} catch {
			toast.error(m.notificationSaveFailed());
			input.checked = !enabled;
		}
	}
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.notifications()}</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 max-sm:px-0 md:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{m.notifications()}</h1>
		<p class="text-base-content/70">{m.notificationsIntro()}</p>
	</header>

	{#if conferences.length === 0}
		<div class="alert" data-testid="notifications-empty">
			<i aria-hidden="true" class="ph-duotone ph-bell-slash text-xl"></i>
			<span>{m.notificationsNoTeam()}</span>
		</div>
	{/if}

	{#each conferences as conference (conference.conferenceId)}
		<section
			class="bg-base-100 rounded-box border-base-300 flex flex-col gap-4 border p-4 sm:p-6"
			aria-labelledby="notifications-{conference.conferenceId}"
			data-testid="notifications-conference"
		>
			<h2 id="notifications-{conference.conferenceId}" class="text-xl font-bold">
				{conference.conferenceTitle}
			</h2>

			{#if conference.settings.length === 0}
				<p class="text-base-content/70 text-sm">{m.notificationsNoTopics()}</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th scope="col">{m.notificationsTopic()}</th>
								<th scope="col" class="w-20 text-center">{m.notificationsChannelEmail()}</th>
								<th scope="col" class="w-20 text-center">{m.notificationsChannelSlack()}</th>
							</tr>
						</thead>
						<tbody>
							{#each conference.settings as setting (setting.id)}
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
									<td class="text-center">
										<input
											type="checkbox"
											class="toggle toggle-primary toggle-sm"
											aria-label={m.notificationsToggleEmail({ topic: label })}
											checked={setting.email}
											onchange={(event) =>
												setChannel({
													conferenceId: conference.conferenceId,
													key: setting,
													channel: 'EMAIL',
													input: event.currentTarget
												})}
										/>
									</td>
									<td class="text-center">
										<input
											type="checkbox"
											class="toggle toggle-primary toggle-sm"
											aria-label={m.notificationsToggleSlack({ topic: label })}
											checked={setting.slack}
											onchange={(event) =>
												setChannel({
													conferenceId: conference.conferenceId,
													key: setting,
													channel: 'SLACK',
													input: event.currentTarget
												})}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<svelte:boundary>
				<SlackConnectionNote
					conferenceId={conference.conferenceId}
					workspaceName={conference.slackWorkspaceName ?? null}
				/>
				{#snippet pending()}
					<div class="skeleton h-12 w-full"></div>
				{/snippet}
			</svelte:boundary>
		</section>
	{/each}

	<p class="text-base-content/70 text-sm">{m.notificationsContentNote()}</p>
</div>
