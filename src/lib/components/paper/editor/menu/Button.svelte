<script lang="ts">
	interface Props {
		onClick: () => void;
		active?: boolean;
		disabled?: boolean;
		label: string;
		icon: string;
	}

	let { onClick, active, disabled, label, icon }: Props = $props();
</script>

<li class="md:tooltip" data-tip={label}>
	<button class={active ? 'menu-active' : ''} onclick={onClick} aria-label={label} {disabled}>
		<i class="{active ? 'ph-fill' : 'ph-duotone'} ph-{icon.replace(/^ph-/, '')}"></i>
	</button>
</li>
