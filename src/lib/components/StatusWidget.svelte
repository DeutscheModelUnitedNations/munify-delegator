<script lang="ts" generics="Status">
	import hotkeys from 'hotkeys-js';

	interface Props {
		title: string;
		faIcon: string;
		activeStatus: Status;
		status: {
			value: Status;
			faIcon: string;
			color: 'success' | 'warning' | 'error' | 'info';
			hotkey?: string;
		}[];
		changeStatus: (status: Status) => Promise<void>;
	}

	let { title, faIcon, activeStatus, status, changeStatus }: Props = $props();

	let loading = $state(false);

	const btnClick = async (status: Status) => {
		loading = true;
		await changeStatus(status);
		loading = false;
	};

	$effect(() => {
		for (const s of status) {
			if (s.hotkey) {
				hotkeys(s.hotkey ?? '', (event, handler) => {
					event.preventDefault();
					btnClick(s.value);
				});
			}
		}
	});
</script>

<div class="card flex flex-col gap-2 bg-base-100 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')} mr-2"></i>
		{title}
	</h3>
	<div class="join w-full">
		{#each status as { value, faIcon, color, hotkey }}
			<button
				class="btn {activeStatus === value && `btn-${color}`} join-item flex-1"
				aria-label={`${value}`}
				onclick={() => btnClick(value)}
			>
				{#if loading}
					<i class="fas fa-spin fa-spinner"></i>
				{:else}
					<i class="fas fa-{faIcon.replace('fa-', '')} text-lg"></i>
					{#if hotkey}
						<span class="kbd kbd-xs hidden sm:inline-block">{hotkey}</span>
					{/if}
				{/if}
			</button>
		{/each}
	</div>
</div>
