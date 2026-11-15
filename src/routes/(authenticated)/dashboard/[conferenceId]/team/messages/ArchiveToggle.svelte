<!--
	@component
	Shows or hides the archive in an inbox's chat list: the chats put away until their next message.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		shown: boolean;
		/** How many chats of the list are archived */
		count: number;
		onToggle: (shown: boolean) => void;
	}

	let { shown, count, onToggle }: Props = $props();
</script>

<button
	type="button"
	class={['btn btn-xs self-start', shown ? 'btn-primary' : 'btn-ghost']}
	aria-pressed={shown}
	title={m.chatArchiveToggleHint()}
	onclick={() => onToggle(!shown)}
	data-testid="chat-archive-toggle"
>
	<i aria-hidden="true" class="ph-duotone ph-archive"></i>
	{m.chatArchiveToggle()}
	<span class="badge badge-xs">{count}</span>
</button>
