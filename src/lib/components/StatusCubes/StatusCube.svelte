<script lang="ts">
	interface Props {
		status: 'DONE' | 'PROBLEM' | 'PENDING' | 'NOT_YET_POSSIBLE';
		task: string;
		faIcon: string;
	}

	let { status, task, faIcon }: Props = $props();

	const getColor = (status: string) => {
		switch (status) {
			case 'DONE':
				return 'bg-success dark:text-base-300';
			case 'PROBLEM':
				return 'bg-error dark:text-base-300';
			case 'PENDING':
				return 'bg-warning dark:text-base-300';
			case 'NOTYET_POSSIBLE':
				return 'bg-info dark:text-base-300';
			default:
				return 'bg-base-200 dark:text-base-300';
		}
	};
</script>

<div
	class="relative flex w-full flex-col items-center justify-center rounded-lg p-6 {getColor(
		status
	)}"
>
	<div class="flex flex-col items-center gap-1">
		<i class="fas fa-{faIcon.replace('fa-', '')} text-2xl"></i>
		<p class="text-center text-sm font-bold">{task}</p>
	</div>
	<div
		class="absolute top-0 right-0 z-[2] flex h-12 w-12 translate-x-4 -translate-y-4 items-center justify-center rounded-full shadow-md {getColor(
			status
		)}"
	>
		{#if status === 'DONE'}
			<i class="fas fa-circle-check text-3xl"></i>
		{:else if status === 'PENDING'}
			<i class="fas fa-seal-exclamation text-3xl"></i>
		{:else if status === 'NOT_YET_POSSIBLE'}
			<i class="fas fa-hourglass-clock text-2xl"></i>
		{:else}
			<i class="fas fa-message-exclamation text-2xl"></i>
		{/if}
	</div>
</div>
