<!--
	@component
	One channel of one notification line: the switch, saved right away, and the test of it.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import type { NotificationChannel, TopicKey } from '#lib/helpers/teamNotifications';
	import NotificationTestButton from './NotificationTestButton.svelte';

	interface Props {
		conferenceId: string;
		key: TopicKey;
		channel: NotificationChannel;
		/** What the topic is called. */
		label: string;
		checked: boolean;
		/** Why the test cannot be sent (no Slack workspace). */
		testUnavailable?: string;
	}

	let { conferenceId, key, channel, label, checked, testUnavailable }: Props = $props();

	/** Saves the switch; one that could not be saved goes back to where it was. */
	async function save(input: HTMLInputElement) {
		const enabled = input.checked;
		try {
			await client.mutate.setNotificationPreference({
				__args: {
					conferenceId,
					topic: key.topic,
					teamFunctionId: key.teamFunctionId,
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

<td class="text-center whitespace-nowrap">
	<input
		type="checkbox"
		class="toggle toggle-primary toggle-sm"
		aria-label={channel === 'EMAIL'
			? m.notificationsToggleEmail({ topic: label })
			: m.notificationsToggleSlack({ topic: label })}
		{checked}
		onchange={(event) => save(event.currentTarget)}
	/>
	<NotificationTestButton {conferenceId} {key} {channel} {label} unavailable={testUnavailable} />
</td>
