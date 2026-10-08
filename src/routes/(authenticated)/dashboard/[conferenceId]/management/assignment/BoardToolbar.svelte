<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** Which group size and role seat count the board shows, and the bulk actions for them. */
	interface Props {
		options: { size: number; openGroups: number; unfilledRoles: number }[];
		size: number;
		seats: number;
		showDisqualified: boolean;
		busy: boolean;
		/** The bulk action under way, whose button shows a spinner. */
		running?: 'autoAssign' | 'reset';
		canAutoAssign: boolean;
		onSize: (size: number) => void;
		onShowDisqualified: (show: boolean) => void;
		onAutoAssign: () => void;
		onReset: () => void;
	}

	let {
		options,
		size,
		seats,
		showDisqualified,
		busy,
		running,
		canAutoAssign,
		onSize,
		onShowDisqualified,
		onAutoAssign,
		onReset
	}: Props = $props();
</script>

{#snippet icon(action: 'autoAssign' | 'reset', name: string)}
	{#if running === action}
		<span class="loading loading-spinner loading-xs"></span>
	{:else}
		<i class="fa-duotone {name}"></i>
	{/if}
{/snippet}

{#snippet todoBadge()}
	<span class="bg-warning size-2.5 rounded-full" aria-hidden="true"></span>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-end gap-x-8 gap-y-4">
		<fieldset class="fieldset min-w-0 flex-1 basis-96 p-0">
			<legend class="fieldset-legend text-base-content/70 pt-0 text-xs tracking-wide uppercase">
				{m.assignmentGroupSize()}
			</legend>
			<div role="tablist" class="flex h-9 items-stretch">
				{#each options as option, i (option.size)}
					<button
						role="tab"
						class="step flex cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold transition-colors
							{i === 0 ? 'step-first' : 'step-middle -ml-2'}
							{i === options.length - 1 ? 'step-last' : ''}
							{option.size === size
							? 'bg-primary text-primary-content'
							: option.unfilledRoles === 0
								? 'bg-success/20 text-success hover:bg-success/30'
								: 'bg-base-300 text-base-content hover:bg-base-content/20'}"
						aria-selected={option.size === size}
						onclick={() => onSize(option.size)}
					>
						{option.size}
						{#if option.unfilledRoles > 0}
							{@render todoBadge()}
						{/if}
					</button>
				{/each}
			</div>
		</fieldset>
	</div>
	<div class="border-base-300 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="checkbox"
				class="toggle toggle-sm toggle-primary"
				checked={showDisqualified}
				onchange={(e) => onShowDisqualified(e.currentTarget.checked)}
			/>
			{m.assignmentShowDisqualified()}
		</label>
		<div class="ml-auto flex flex-wrap items-center gap-2">
			<button class="btn btn-ghost btn-sm" disabled={busy} onclick={onReset}>
				{@render icon('reset', 'fa-rotate-left')}
				{m.assignmentResetSeats({ count: seats })}
			</button>
			<button
				class="btn btn-primary btn-sm"
				disabled={busy || !canAutoAssign}
				onclick={onAutoAssign}
			>
				{@render icon('autoAssign', 'fa-wand-magic-sparkles')}
				{m.assignmentAutoAssign({ size })}
			</button>
		</div>
	</div>
</div>

<style>
	.step {
		--arrow: 0.75rem;
		flex: 1 1 0;
		min-width: 3.5rem;
		padding-inline: 1.25rem;
	}
	.step-first {
		clip-path: polygon(
			0 0,
			calc(100% - var(--arrow)) 0,
			100% 50%,
			calc(100% - var(--arrow)) 100%,
			0 100%
		);
		padding-inline-start: 0.75rem;
	}
	.step-middle {
		clip-path: polygon(
			0 0,
			calc(100% - var(--arrow)) 0,
			100% 50%,
			calc(100% - var(--arrow)) 100%,
			0 100%,
			var(--arrow) 50%
		);
	}
	.step-last {
		clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, var(--arrow) 50%);
	}
	.step-first.step-last {
		clip-path: none;
	}
</style>
