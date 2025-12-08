<script lang="ts">
	interface Props {
		icon: string;
		text: string;
		vertical?: boolean;
		classes?: string;
	}

	let { icon, text, classes, vertical }: Props = $props();
</script>

<div
	class="p-3 {classes} rounded-field flex {vertical
		? 'flex-col'
		: 'flex-row'} items-center justify-center shadow-sm"
>
	<i class="fas fa-{icon.replace('fa-', '')} text-lg"></i>
	<div class="text-xs {vertical ? 'mt-1' : 'ml-3'}">{text}</div>
</div>
