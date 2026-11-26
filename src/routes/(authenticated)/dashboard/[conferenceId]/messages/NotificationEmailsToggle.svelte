<!--
	@component
	The caller's own switches for the mail about unread messages, an entry of the chat settings menu:
	all of it, and the groups of their committee or role on their own.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const settings = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			messageNotificationEmails: true,
			groupMessageNotificationEmails: true
		})
	);

	async function setGroupEmails(enabled: boolean) {
		const promise = Promise.resolve(
			client.mutate.setGroupMessageNotificationEmails({ __args: { enabled } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: enabled ? m.chatGroupNotificationsOn() : m.chatGroupNotificationsOff(),
			error: m.chatSaveFailed()
		});
		await promise;
	}

	async function setNotificationEmails(enabled: boolean) {
		const promise = Promise.resolve(
			client.mutate.setMessageNotificationEmails({ __args: { enabled } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: enabled ? m.chatNotificationsOn() : m.chatNotificationsOff(),
			error: m.chatSaveFailed()
		});
		await promise;
	}
</script>

<label class="flex cursor-pointer items-center gap-3">
	<input
		type="checkbox"
		class="toggle toggle-primary toggle-sm"
		checked={settings.messageNotificationEmails}
		onchange={(event) => setNotificationEmails(event.currentTarget.checked)}
		data-testid="chat-notification-emails"
	/>
	<span class="text-base-content/80">{m.chatNotificationEmails()}</span>
</label>
<label
	class={[
		'flex cursor-pointer items-center gap-3 pl-4',
		!settings.messageNotificationEmails && 'opacity-60'
	]}
>
	<input
		type="checkbox"
		class="toggle toggle-primary toggle-xs"
		checked={settings.groupMessageNotificationEmails}
		disabled={!settings.messageNotificationEmails}
		onchange={(event) => setGroupEmails(event.currentTarget.checked)}
		data-testid="chat-group-notification-emails"
	/>
	<span class="text-base-content/80 text-sm">{m.chatGroupNotificationEmails()}</span>
</label>
