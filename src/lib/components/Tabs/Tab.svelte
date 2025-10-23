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
	tabindex="-1"
	{onclick}
	onkeydown={onclick}
	{href}
>
	<div class="inline-flex items-center gap-2 {active && 'font-bold'}">
		<i class="fa-duotone fa-{icon.replace('fa-', '')}"></i>
		{title}
	</div>
</a>
