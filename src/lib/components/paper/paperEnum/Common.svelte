<script lang="ts">
	interface Props {
		icon: string;
		text: string;
		color?: string;
		size?: 'xs' | 'sm' | 'md';
	}

	let { icon, text, color = 'badge-ghost', size = 'sm' }: Props = $props();

	const sizeClasses = {
		xs: 'badge-xs text-[10px] gap-1',
		sm: 'badge-sm text-xs gap-1.5',
		md: 'badge-md text-sm gap-2'
	};
</script>

<span class="badge {color} {sizeClasses[size]} font-medium whitespace-nowrap">
	<i class="fa-solid fa-{icon.replace('fa-', '')}"></i>
	<span>{text}</span>
</span>
