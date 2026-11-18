<!--
	@component
	Sends the caller a test of one of their notifications on one channel, the way the real one
	arrives (`sendNotificationTest`), and says how it went.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import type { NotificationChannel, TopicKey } from '#lib/helpers/teamNotifications';
	import { notificationTestToast } from './notificationTestToast';

	interface Props {
		conferenceId: string;
		key: TopicKey;
		channel: NotificationChannel;
		/** What the topic is called, for the button's name. */
		label: string;
		/** Why it cannot be sent (no Slack workspace); the button is disabled then. */
		unavailable?: string;
	}

	let { conferenceId, key, channel, label, unavailable }: Props = $props();
	let sending = $state(false);

	const name = $derived(
		channel === 'EMAIL'
			? m.notificationsTestEmail({ topic: label })
			: m.notificationsTestSlack({ topic: label })
	);

	async function send() {
		sending = true;
		let result: string | undefined;
		try {
			// a scalar answer comes wrapped: read it as the plain value it is
			result = String(
				await client.mutate.sendNotificationTest({
					__args: { conferenceId, topic: key.topic, teamFunctionId: key.teamFunctionId, channel }
				})
			);
		} catch {
			result = undefined;
		} finally {
			sending = false;
		}
		const { success, message } = notificationTestToast({ channel, result });
		if (success) toast.success(message);
		else toast.error(message);
	}
</script>

<span class="tooltip" data-tip={unavailable ?? name}>
	<button
		type="button"
		class="btn btn-ghost btn-xs btn-square"
		aria-label={name}
		disabled={sending || unavailable !== undefined}
		onclick={send}
		data-testid="notification-test"
		data-channel={channel}
	>
		{#if sending}
			<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
		{:else}
			<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
		{/if}
	</button>
</span>
