<script lang="ts">
	interface Props {
		active: boolean;
		disabled?: boolean;
		title: string;
		icon: string;
		onclick: () => void;
	}
	let { active, disabled = false, title, icon, onclick }: Props = $props();
</script>

<!-- svelte-ignore a11y_missing_attribute -->
<a
	role="tab"
	class="tab {active && 'tab-active'} {disabled && 'tab-disabled'}"
	tabindex="-1"
	{onclick}
	onkeydown={onclick}
>
	<div class="inline-flex items-center gap-2 {active && 'font-bold'}">
		<i class="fa-duotone fa-{icon.replace('fa-', '')}"></i>
		{title}
	</div>
</a>
