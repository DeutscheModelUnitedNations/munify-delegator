<!--
	@component
	The messages participant care hid under a report, as its record keeps them: the text, who wrote
	it and when, why it was hidden, by whom and when.
-->
<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		messages: readonly {
			id: string;
			body: string;
			createdAt: Date | string;
			authorName?: string | null;
			hiddenAt: Date | string;
			hiddenReason: string;
			hiddenByName?: string | null;
		}[];
	}

	let { messages }: Props = $props();

	const dateTime = (date: Date | string) =>
		new Date(date).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="mt-2 flex flex-col gap-1.5" data-testid="chat-report-hidden-messages">
	<p class="text-error flex items-center gap-1 text-xs font-semibold">
		<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
		{m.chatHiddenMessages({ count: messages.length })}
	</p>
	<ul class="flex flex-col gap-1.5">
		{#each messages as hidden (hidden.id)}
			<li
				class="border-error/60 bg-error/5 rounded-field border border-dashed p-2"
				data-testid="chat-report-hidden-message"
			>
				<p class="whitespace-pre-wrap">{hidden.body}</p>
				<p class="text-base-content/60 mt-1 text-xs">
					{m.chatHiddenWrittenBy({
						name: hidden.authorName ?? '–',
						time: dateTime(hidden.createdAt)
					})}
				</p>
				<p class="mt-1 text-xs whitespace-pre-wrap">
					<span class="font-medium">{m.chatHiddenReason()}:</span>
					{hidden.hiddenReason}
				</p>
				<p class="text-base-content/60 text-xs">
					{m.chatMessageHiddenBy({
						name: hidden.hiddenByName ?? '–',
						time: dateTime(hidden.hiddenAt)
					})}
				</p>
			</li>
		{/each}
	</ul>
</div>
