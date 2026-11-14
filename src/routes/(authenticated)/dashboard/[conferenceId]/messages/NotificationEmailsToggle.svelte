<!--
	@component
	The caller's own switch for the mail about unread messages, under their chat list.
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
		await client.liveQuery.user({ __args: { id: userId }, messageNotificationEmails: true })
	);

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

<label class="border-base-300 flex cursor-pointer items-center gap-3 border-t px-4 py-3 text-sm">
	<input
		type="checkbox"
		class="toggle toggle-primary toggle-sm"
		checked={settings.messageNotificationEmails}
		onchange={(event) => setNotificationEmails(event.currentTarget.checked)}
		data-testid="chat-notification-emails"
	/>
	<span class="text-base-content/80">{m.chatNotificationEmails()}</span>
</label>
