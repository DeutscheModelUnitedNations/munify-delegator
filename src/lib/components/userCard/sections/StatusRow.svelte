<script lang="ts" module>
	export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

	export interface StatusOption<S> {
		value: S;
		label: string;
		faIcon: string;
		tone: StatusTone;
	}
</script>

<script lang="ts" generics="S">
	/**
	 * One status of a person as a list row: what it is, what it currently says in words, and the
	 * buttons to change it. The postal registration page keeps the large `StatusWidget` for quick
	 * clicking; the user card reads better with the state spelled out.
	 */
	interface Props {
		title: string;
		faIcon: string;
		active: S;
		options: StatusOption<S>[];
		change: (status: S) => Promise<void>;
	}

	let { title, faIcon, active, options, change }: Props = $props();

	const toneText: Record<StatusTone, string> = {
		success: 'text-success',
		warning: 'text-warning',
		error: 'text-error',
		neutral: 'text-base-content/60'
	};
	const toneButton: Record<StatusTone, string> = {
		success: 'btn-success',
		warning: 'btn-warning',
		error: 'btn-error',
		neutral: 'btn-neutral'
	};

	const current = $derived(options.find((option) => option.value === active));

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

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
	<i
		class="fa-sharp-duotone fa-solid fa-{faIcon.replace(
			'fa-',
			''
		)} text-base-content/60 w-6 text-center text-lg"
	></i>
	<div class="flex min-w-48 grow flex-col">
		<span class="font-semibold">{title}</span>
		{#if current}
			<span class="text-sm {toneText[current.tone]}">
				<i class="fa-sharp-duotone fa-solid fa-{current.faIcon.replace('fa-', '')} mr-1"></i>
				{current.label}
			</span>
		{/if}
	</div>
	<div class="join">
		{#each options as option (option.value)}
			<button
				class="btn btn-sm join-item tooltip w-24 {option.value === active
					? toneButton[option.tone]
					: ''}"
				data-tip={option.label}
				aria-label={option.label}
				aria-pressed={option.value === active}
				disabled={pending !== undefined}
				onclick={() => select(option.value)}
			>
				{#if pending === option.value}
					<i class="fas fa-spin fa-spinner"></i>
				{:else}
					<i class="fas fa-{option.faIcon.replace('fa-', '')}"></i>
				{/if}
			</button>
		{/each}
	</div>
</div>
