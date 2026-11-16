<!--
	@component
	Puts a team chat away into the archive of its inbox, or takes it out again, for everybody
	answering the inbox. An archived chat comes back by itself with its next message.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		chatId: string;
		archived: boolean;
		/** Called once the chat is put away: it leaves the list, so whoever shows it closes it */
		onArchived?: () => void;
	}

	let { chatId, archived, onArchived }: Props = $props();

	const label = $derived(archived ? m.chatUnarchive() : m.chatArchive());

	async function toggle() {
		const archive = !archived;
		const promise = Promise.resolve(
			client.mutate.setChatArchived({ __args: { chatId, archived: archive } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: archive ? m.chatArchivedDone() : m.chatUnarchivedDone(),
			error: m.chatSaveFailed()
		});
		await promise;
		if (archive) onArchived?.();
	}
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm btn-square"
	aria-label={label}
	title={label}
	aria-pressed={archived}
	onclick={toggle}
	data-testid="chat-archive"
>
	<i aria-hidden="true" class={archived ? 'ph-fill ph-archive' : 'ph-duotone ph-archive'}></i>
</button>
