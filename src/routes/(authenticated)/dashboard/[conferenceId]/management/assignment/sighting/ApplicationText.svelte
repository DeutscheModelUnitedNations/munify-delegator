<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** One free text of an application with its length, or a mark that it is missing. */
	interface Props {
		icon: string;
		label: string;
		text: string | null;
	}

	let { icon, label, text }: Props = $props();
</script>

<section class="flex flex-col gap-1">
	<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
		<i class="fa-sharp-duotone fa-solid fa-{icon}"></i>
		{label}
		{#if text}
			<span class="text-base-content/50 text-xs font-normal">
				{m.assignmentCharacters({ count: text.length })}
			</span>
		{/if}
	</h4>
	{#if text}
		<p class="whitespace-pre-line">{text}</p>
	{:else}
		<p class="text-error">{m.assignmentMissingText()}</p>
	{/if}
</section>
