<script lang="ts">
	interface Props {
		color?: 'info' | 'success' | 'warning' | 'error';
		blink?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		tooltip?: string;
	}

	let { color, blink = true, size, tooltip }: Props = $props();

	const getColorClass = () => {
		switch (color) {
			case 'info':
				return 'status-info';
			case 'success':
				return 'status-success';
			case 'warning':
				return 'status-warning';
			case 'error':
				return 'status-error';
			default:
				return 'status-info';
		}
	};

	const getSizeClass = () => {
		switch (size) {
			case 'xs':
				return 'status-xs';
			case 'sm':
				return 'status-sm';
			case 'md':
				return 'status-md';
			case 'lg':
				return 'status-lg';
			case 'xl':
				return 'status-xl';
			default:
				return 'status-md';
		}
	};
</script>

<div class="tooltip tooltip-top inline-grid *:[grid-area:1/1]" data-tip={tooltip}>
	<div aria-label="status" class="status {getSizeClass()} {getColorClass()}"></div>
	{#if blink}
		<div aria-label="status" class="status {getSizeClass()} {getColorClass()} animate-ping"></div>
	{/if}
</div>
