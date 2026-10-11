<script lang="ts">
	interface Props {
		icon: string;
		primary: string;
		secondary?: string;
		active: boolean;
		/** A result that stands apart from the list, such as a search just made on another device. */
		highlight?: boolean;
		onclick: () => void;
	}

	let { icon, primary, secondary, active, highlight = false, onclick }: Props = $props();
</script>

<button
	class="flex w-full cursor-pointer items-center gap-3 rounded-box px-3 py-2 text-left transition-colors {highlight
		? 'bg-warning/15 ring-warning/50 hover:bg-warning/25 mb-1 ring-1'
		: active
			? 'bg-base-200'
			: 'hover:bg-base-200/50'}"
	{onclick}
	role="option"
	aria-selected={active}
>
	<i
		class="fa-sharp-duotone fa-solid {icon} w-5 text-center {highlight
			? 'text-warning animate-pulse'
			: 'text-base-content/60'}"
	></i>
	<div class="min-w-0 flex-1">
		<span class="text-sm font-medium">{primary}</span>
		{#if secondary}
			<span class="ml-2 text-xs text-base-content/50">{secondary}</span>
		{/if}
	</div>
	{#if highlight}
		<span class="relative flex size-2.5 shrink-0">
			<span class="bg-warning absolute inline-flex size-2.5 animate-ping rounded-full opacity-75"
			></span>
			<span class="bg-warning relative inline-flex size-2.5 rounded-full"></span>
		</span>
	{/if}
</button>
