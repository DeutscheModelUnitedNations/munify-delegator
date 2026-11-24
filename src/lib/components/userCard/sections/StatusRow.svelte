<script lang="ts" module>
	export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

	export interface StatusOption<S> {
		value: S;
		label: string;
		/** What the button says while it is the active one, where the label is too long for it */
		short?: string;
		icon: string;
		tone: StatusTone;
	}
</script>

<script lang="ts" generics="S">
	/**
	 * One status of a person as a list row: what it is, and the buttons to change it, the active one
	 * saying what it currently is. The postal registration page keeps the large `StatusWidget` for
	 * quick clicking.
	 */
	interface Props {
		title: string;
		icon: string;
		active: S;
		options: StatusOption<S>[];
		change: (status: S) => Promise<void>;
	}

	let { title, icon, active, options, change }: Props = $props();

	const toneButton: Record<StatusTone, string> = {
		success: 'btn-success',
		warning: 'btn-warning',
		error: 'btn-error',
		neutral: 'btn-neutral'
	};

	let pending = $state<S>();

	const select = async (value: S) => {
		if (value === active) return;
		pending = value;
		try {
			await change(value);
		} finally {
			pending = undefined;
		}
	};
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
	<i
		aria-hidden="true"
		class="ph-duotone ph-{icon.replace(/^ph-/, '')} text-base-content/60 w-5 text-center"
	></i>
	<span class="min-w-32 flex-1 text-sm">{title}</span>
	<!-- As wide for every status, so the buttons of a list stand in one line -->
	<div class="join w-56 max-w-full" role="group" aria-label={title}>
		{#each options as option (option.value)}
			{@const shown = option.value === active}
			<button
				class="btn btn-sm join-item {shown
					? `min-w-0 flex-1 px-2 ${toneButton[option.tone]}`
					: 'btn-square'}"
				title={option.label}
				aria-label={option.label}
				aria-pressed={shown}
				disabled={pending !== undefined}
				onclick={() => select(option.value)}
			>
				{#if pending === option.value}
					<i aria-hidden="true" class="ph-fill animate-spin ph-spinner-gap"></i>
				{:else}
					<i aria-hidden="true" class="ph-fill ph-{option.icon.replace(/^ph-/, '')}"></i>
				{/if}
				{#if shown}
					<span class="truncate">{option.short ?? option.label}</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
