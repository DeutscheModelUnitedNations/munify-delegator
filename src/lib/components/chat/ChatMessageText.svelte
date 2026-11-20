<!--
	@component
	What one message of a bubble says. A message participant care hid reads as a placeholder for the
	chat's people; participant care sees its text, marked as hidden, with the reason, who hid it and
	when. While reviewing, `onHide` offers to hide a message not hidden yet.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { hiddenState } from './hiddenMessages';

	interface Props {
		message: {
			body: string | null;
			hiddenAt?: Date | string | null;
			hiddenByName?: string | null;
			hiddenReason?: string | null;
		};
		onHide?: () => void;
	}

	let { message, onHide }: Props = $props();

	const shown = $derived(hiddenState(message));
	const hiddenAt = $derived(
		message.hiddenAt
			? new Date(message.hiddenAt).toLocaleString(getLocale(), {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			: ''
	);
</script>

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
			{m.chatMessageHiddenBy({ name: message.hiddenByName ?? '–', time: hiddenAt })}
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
				onclick={onHide}
				data-testid="chat-message-hide"
			>
				<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
			</button>
		{/if}
	</div>
{/if}
