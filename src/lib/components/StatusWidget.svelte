<script lang="ts" generics="Status">
	import hotkeys from 'hotkeys-js';
	import { onDestroy } from 'svelte';

	interface Props {
		title: string;
		faIcon: string;
		activeStatus: Status;
		status: {
			value: Status;
			faIcon: string;
			color: 'btn-success' | 'btn-warning' | 'btn-error' | 'btn-info';
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

	onDestroy(() => {
		for (const s of status) {
			if (s.hotkey) {
				hotkeys.unbind(s.hotkey ?? '');
			}
		}
	});
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')} mr-2"></i>
		{title}
	</h3>
	<div class="join w-full">
		{#each status as { value, faIcon, color, hotkey }}
			<button
				class="btn {activeStatus === value && `${color}`} join-item flex-1"
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
