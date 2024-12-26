<script lang="ts">
	interface Props {
		status: 'DONE' | 'PROBLEM' | 'PENDING';
		task: string;
		faIcon: string;
	}

	let { status, task, faIcon }: Props = $props();
</script>

<div class="flex w-full flex-col items-center justify-center rounded-lg bg-base-200 p-6">
	<div class="flex h-16 flex-col items-center gap-1">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')}"></i>
		<p class="text-center text-sm font-bold">{task}</p>
	</div>
	<div class="mt-2 flex gap-1">
		{#if status === 'DONE'}
			<i class="fas fa-circle-check text-3xl text-success"></i>
		{:else if status === 'PENDING'}
			<i class="fas fa-octagon-xmark text-3xl text-error"></i>
		{:else}
			<i class="fas fa-triangle-exclamation text-3xl text-warning"></i>
		{/if}
	</div>
</div>
