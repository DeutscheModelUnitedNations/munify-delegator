<!--
	@component
	One entry of the new-message picker: a picture, what it is called and a line about it.
-->
<script lang="ts">
	import ChatAvatar from './ChatAvatar.svelte';

	interface Props {
		avatar: { alpha2Code: string } | { icon: string };
		title: string;
		detail?: string;
		disabled?: boolean;
		onclick: () => void;
		testId?: string;
	}

	let { avatar, title, detail, disabled = false, onclick, testId }: Props = $props();
</script>

<button
	type="button"
	class="hover:bg-base-200 flex w-full items-center gap-3 rounded-box px-2 py-1.5 text-left"
	{disabled}
	{onclick}
	data-testid={testId}
>
	<ChatAvatar {avatar} size="sm" />
	<span class="flex min-w-0 flex-col leading-tight">
		<span class="truncate font-medium">{title}</span>
		{#if detail}
			<span class="text-base-content/60 truncate text-xs">{detail}</span>
		{/if}
	</span>
</button>
