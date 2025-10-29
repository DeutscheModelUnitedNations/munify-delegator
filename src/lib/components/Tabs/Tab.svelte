<script lang="ts">
	interface Props {
		active: boolean;
		disabled?: boolean;
		title: string;
		icon: string;
		onclick?: () => void;
		href?: string;
	}
	let { active, disabled = false, title, icon, onclick, href }: Props = $props();
</script>

<a
	role="tab"
	class="tab {active && 'tab-active'} {disabled && 'tab-disabled'}"
	aria-selected={active}
	aria-disabled={disabled}
	tabindex={disabled ? -1 : 0}
	{onclick}
	onkeydown={onclick}
	href={disabled ? undefined : href}
>
	<div class="inline-flex items-center gap-2 {active && 'font-bold'}">
		<i class="fa-duotone fa-{icon.replace('fa-', '')}"></i>
		{title}
	</div>
</a>
