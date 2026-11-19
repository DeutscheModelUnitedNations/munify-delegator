<!--
	@component
	One message of a thread: the caller's side on the right, the other on the left, with the
	author's line where a side has more than one voice and the paper it is about. A message
	participant care hid reads as a placeholder for the chat's people; participant care reviewing
	the chat sees its text, marked as hidden, with who hid it and why. While reviewing, `onHide`
	offers to hide a message.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { hiddenState } from './hiddenMessages';

	interface Props {
		message: {
			body: string | null;
			createdAt: Date | string;
			paperId?: string | null;
			hiddenAt?: Date | string | null;
			hiddenByName?: string | null;
			hiddenReason?: string | null;
		};
		own: boolean;
		/** The line above the bubble, where one is shown */
		author?: string;
		/** Follows a message of the same author, so it sits closer */
		continues: boolean;
		conferenceId: string;
		/** Participant care reviewing the chat: hides this message */
		onHide?: () => void;
	}

	let { message, own, author, continues, conferenceId, onHide }: Props = $props();

	const written = $derived(new Date(message.createdAt));
	const shown = $derived(hiddenState(message));
	const hiddenAt = $derived(
		message.hiddenAt
			? new Date(message.hiddenAt).toLocaleString(getLocale(), {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			: ''
	);
	// the look of each side: where the bubble sits, its colours, the paper link's and the time's
	const look = $derived(
		shown === 'placeholder'
			? {
					row: own ? 'items-end' : 'items-start',
					bubble: 'border-base-300 text-base-content/70 border border-dashed italic',
					paper: 'bg-base-200',
					time: 'text-base-content/60'
				}
			: shown === 'evidence'
				? {
						row: own ? 'items-end' : 'items-start',
						bubble: 'border-error/60 bg-error/5 text-base-content border border-dashed',
						paper: 'bg-base-300',
						time: 'text-base-content/60'
					}
				: own
					? {
							row: 'items-end',
							bubble: 'bg-primary text-primary-content',
							paper: 'bg-primary-content/15',
							time: 'opacity-80'
						}
					: {
							row: 'items-start',
							bubble: 'bg-base-200 text-base-content',
							paper: 'bg-base-300',
							time: 'text-base-content/60'
						}
	);
</script>

<div
	class={['flex max-w-full flex-col', look.row, continues ? 'mt-1' : 'mt-3']}
	data-testid="chat-message"
	data-hidden={shown === 'visible' ? undefined : shown}
>
	{#if author}
		<span class="text-base-content/60 mb-0.5 px-1 text-xs">{author}</span>
	{/if}
	<div class={['flex max-w-full items-start gap-1', own && 'flex-row-reverse']}>
		<div class={['max-w-5/6 rounded-box px-3.5 py-2 text-sm sm:max-w-3/4', look.bubble]}>
			{#if shown === 'evidence'}
				<p class="text-error mb-1 flex items-center gap-1 text-xs font-semibold not-italic">
					<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
					{m.chatMessageHiddenBadge()}
				</p>
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
				<p class="flex items-center gap-1.5">
					<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
					{m.chatMessageHiddenPlaceholder()}
				</p>
			{:else}
				<p class="break-words whitespace-pre-wrap">{message.body}</p>
			{/if}
			{#if shown === 'evidence'}
				<div class="border-base-300 mt-2 border-t pt-1.5 text-xs">
					{#if message.hiddenReason}
						<p class="whitespace-pre-wrap">
							<span class="font-medium">{m.chatHiddenReason()}:</span>
							{message.hiddenReason}
						</p>
					{/if}
					<p class="text-base-content/60">
						{m.chatMessageHiddenBy({ name: message.hiddenByName ?? '–', time: hiddenAt })}
					</p>
				</div>
			{/if}
			<time class={['mt-0.5 block text-right text-xs', look.time]} datetime={written.toISOString()}>
				{written.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
			</time>
		</div>
		{#if onHide}
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-error mt-1 shrink-0"
				aria-label={m.chatHideMessage()}
				title={m.chatHideMessage()}
				onclick={onHide}
				data-testid="chat-message-hide"
			>
				<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
			</button>
		{/if}
	</div>
</div>
