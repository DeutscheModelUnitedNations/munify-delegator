<script lang="ts">
	interface Props {
		onClick: () => void;
		active?: boolean;
		label: string;
		icon: string;
	}

	let { onClick, active, label, icon }: Props = $props();
</script>

<li class="md:tooltip" data-tip={label}>
	<button class={active ? 'menu-active' : ''} onclick={onClick} aria-label={label}>
		<i class="fa-{active ? 'solid' : 'duotone'} fa-{icon.replace('fa-', '')}"></i>
		<span class="md:hidden">{label}</span>
	</button>
</li>
