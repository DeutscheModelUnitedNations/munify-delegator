<!--
	@component
	One bubble of a thread: what one author wrote in a row (`runsOf`), the caller's side on the
	right, the other on the left. The author's name heads it where a side has more than one voice,
	the time of the last message closes it, and each message shows its full time on hover.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	interface Props {
		messages: readonly {
			id: string;
			body: string;
			createdAt: Date | string;
			paperId?: string | null;
		}[];
		own: boolean;
		/** The name heading the bubble, where one is shown */
		author?: string;
		/** Follows a bubble of the same author, so it sits closer */
		continues: boolean;
		conferenceId: string;
	}

	let { messages, own, author, continues, conferenceId }: Props = $props();

	const last = $derived(messages.at(-1));
	const lastWritten = $derived(last ? new Date(last.createdAt) : null);
	// the look of each side: where the bubble sits, its colours, the paper link's, the name's and the time's
	const look = $derived(
		own
			? {
					row: 'items-end',
					bubble: 'bg-primary text-primary-content',
					paper: 'bg-primary-content/15',
					author: 'opacity-80',
					time: 'opacity-80'
				}
			: {
					row: 'items-start',
					bubble: 'bg-base-200 text-base-content',
					paper: 'bg-base-300',
					author: 'text-primary',
					time: 'text-base-content/60'
				}
	);
	const enter = $derived({
		y: 10,
		duration: prefersReducedMotion.current ? 0 : 220,
		easing: cubicOut
	});

	const fullTime = (createdAt: Date | string) =>
		new Date(createdAt).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

<!-- a new bubble flies in as a whole, a message joining one flies in on its own -->
<div class={['flex max-w-full flex-col', look.row, continues ? 'mt-1' : 'mt-3']} in:fly={enter}>
	<div
		class={[
			'flex max-w-5/6 flex-col gap-1.5 rounded-box px-3.5 py-2 text-sm sm:max-w-3/4',
			look.bubble
		]}
	>
		{#each messages as message, index (message.id)}
			<div in:fly={enter} title={fullTime(message.createdAt)} data-testid="chat-message">
				{#if index === 0 && author}
					<span class={['mb-0.5 block text-xs font-semibold', look.author]}>{author}</span>
				{/if}
				{#if message.paperId}
					<a
						href={resolve(`dashboard/${conferenceId}/paperhub/${message.paperId}`)}
						class={[
							'mb-1.5 flex items-center gap-1.5 rounded-box px-2 py-1 text-xs font-medium',
							look.paper
						]}
					>
						<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
						{m.chatAboutPaper()}
					</a>
				{/if}
				<p class="break-words whitespace-pre-wrap">{message.body}</p>
			</div>
		{/each}
		{#if lastWritten}
			<time
				class={['-mt-1 block text-right text-xs', look.time]}
				datetime={lastWritten.toISOString()}
			>
				{lastWritten.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
			</time>
		{/if}
	</div>
</div>
