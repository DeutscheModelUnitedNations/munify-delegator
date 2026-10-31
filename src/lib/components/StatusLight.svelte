<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	interface Props {
		color?: 'info' | 'success' | 'warning' | 'error';
		blink?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		tooltip?: string;
	}

	let { color, blink = true, size, tooltip }: Props = $props();

	const colorClasses = {
		info: 'status-info',
		success: 'status-success',
		warning: 'status-warning',
		error: 'status-error'
	} satisfies Record<NonNullable<Props['color']>, string>;

	const sizeClasses = {
		xs: 'status-xs',
		sm: 'status-sm',
		md: 'status-md',
		lg: 'status-lg',
		xl: 'status-xl'
	} satisfies Record<NonNullable<Props['size']>, string>;

	const getColorClass = () => colorClasses[color ?? 'info'];
	const getSizeClass = () => sizeClasses[size ?? 'md'];
</script>

<div class="tooltip tooltip-top inline-grid *:[grid-area:1/1]" data-tip={tooltip}>
	<div aria-label={m.status()} class="status {getSizeClass()} {getColorClass()}"></div>
	{#if blink}
		<div
			aria-label={m.status()}
			class="status {getSizeClass()} {getColorClass()} animate-ping"
		></div>
	{/if}
</div>
