<!--
	@component
	One message of a thread: the caller's side on the right, the other on the left, with the
	author's line where a side has more than one voice and the paper it is about.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	interface Props {
		message: { body: string; createdAt: Date | string; paperId?: string | null };
		own: boolean;
		/** The line above the bubble, where one is shown */
		author?: string;
		/** Follows a message of the same author, so it sits closer */
		continues: boolean;
		conferenceId: string;
	}

	let { message, own, author, continues, conferenceId }: Props = $props();

	const written = $derived(new Date(message.createdAt));
	// the look of each side: where the bubble sits, its colours, the paper link's and the time's
	const look = $derived(
		own
			? {
					row: 'items-end',
					bubble: 'bg-primary text-primary-content rounded-br-md',
					paper: 'bg-primary-content/15',
					time: 'opacity-80'
				}
			: {
					row: 'items-start',
					bubble: 'bg-base-200 text-base-content rounded-bl-md',
					paper: 'bg-base-300',
					time: 'text-base-content/60'
				}
	);
</script>

<div
	class={['flex max-w-full flex-col', look.row, continues ? 'mt-1' : 'mt-3']}
	data-testid="chat-message"
>
	{#if author}
		<span class="text-base-content/60 mb-0.5 px-1 text-xs">{author}</span>
	{/if}
	<div class={['max-w-5/6 rounded-2xl px-3.5 py-2 text-sm sm:max-w-3/4', look.bubble]}>
		{#if message.paperId}
			<a
				href={resolve(`dashboard/${conferenceId}/paperhub/${message.paperId}`)}
				class={[
					'mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium',
					look.paper
				]}
			>
				<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
				{m.chatAboutPaper()}
			</a>
		{/if}
		<p class="break-words whitespace-pre-wrap">{message.body}</p>
		<time class={['mt-0.5 block text-right text-xs', look.time]} datetime={written.toISOString()}>
			{written.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
		</time>
	</div>
</div>
