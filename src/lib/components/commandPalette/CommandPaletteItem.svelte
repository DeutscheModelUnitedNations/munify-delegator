<script lang="ts">
	interface Props {
		icon: string;
		primary: string;
		secondary?: string;
		active: boolean;
		onclick: () => void;
	}

	let { icon, primary, secondary, active, onclick }: Props = $props();
</script>

<button
	class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors {active
		? 'bg-base-200'
		: 'hover:bg-base-200/50'}"
	{onclick}
	role="option"
	aria-selected={active}
>
	<i class="fa-duotone {icon} w-5 text-center text-base-content/60"></i>
	<div class="min-w-0 flex-1">
		<span class="text-sm font-medium">{primary}</span>
		{#if secondary}
			<span class="ml-2 text-xs text-base-content/50">{secondary}</span>
		{/if}
	</div>
</button>
