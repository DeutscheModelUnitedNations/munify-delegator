<!--
	@component
	One bubble of a thread: what one author wrote in a row (`runsOf`), the caller's side on the
	right, the other on the left. The author's name heads it where a side has more than one voice,
	the time of the last message closes it, and each message shows its full time on hover. A message
	participant care hid reads as a placeholder for the chat's people; participant care reviewing the
	chat sees its text, marked as hidden, with who hid it and why. While reviewing, `onHide` offers to
	hide each message not hidden yet.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { hiddenState } from './hiddenMessages';

	interface Props {
		messages: readonly {
			id: string;
			body: string | null;
			createdAt: Date | string;
			paperId?: string | null;
			hiddenAt?: Date | string | null;
			hiddenByName?: string | null;
			hiddenReason?: string | null;
		}[];
		own: boolean;
		/** The name heading the bubble, where one is shown */
		author?: string;
		/** Follows a bubble of the same author, so it sits closer */
		continues: boolean;
		conferenceId: string;
		/** Participant care reviewing the chat: hides one of these messages */
		onHide?: (messageId: string) => void;
	}

	let { messages, own, author, continues, conferenceId, onHide }: Props = $props();

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
			{@const shown = hiddenState(message)}
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
				{#if shown === 'placeholder'}
					<p class="flex items-center gap-1.5 italic opacity-80" data-hidden="placeholder">
						<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
						{m.chatMessageHiddenPlaceholder()}
					</p>
				{:else if shown === 'evidence'}
					<div
						class="border-error/60 bg-base-100 text-base-content rounded-field border border-dashed p-2"
						data-hidden="evidence"
					>
						<p class="text-error mb-1 flex items-center gap-1 text-xs font-semibold">
							<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
							{m.chatMessageHiddenBadge()}
						</p>
						<p class="break-words whitespace-pre-wrap">{message.body}</p>
						<p class="mt-1.5 text-xs whitespace-pre-wrap">
							<span class="font-medium">{m.chatHiddenReason()}:</span>
							{message.hiddenReason ?? '–'}
						</p>
						<p class="text-base-content/60 text-xs">
							{m.chatMessageHiddenBy({
								name: message.hiddenByName ?? '–',
								time: message.hiddenAt ? fullTime(message.hiddenAt) : ''
							})}
						</p>
					</div>
				{:else}
					<div class="flex items-start gap-1">
						<p class="min-w-0 flex-1 break-words whitespace-pre-wrap">{message.body}</p>
						{#if onHide}
							<button
								type="button"
								class="btn btn-ghost btn-xs btn-square -my-0.5 shrink-0 opacity-70 hover:opacity-100"
								aria-label={m.chatHideMessage()}
								title={m.chatHideMessage()}
								onclick={() => onHide(message.id)}
								data-testid="chat-message-hide"
							>
								<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
							</button>
						{/if}
					</div>
				{/if}
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
