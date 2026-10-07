<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** Which group size and role seat count the board shows, and the bulk actions for them. */
	interface Props {
		options: { size: number; openGroups: number; openRoles: number }[];
		size: number;
		seats: number;
		showDisqualified: boolean;
		busy: boolean;
		canAutoAssign: boolean;
		onSize: (size: number) => void;
		onSeats: (seats: number) => void;
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
		canAutoAssign,
		onSize,
		onSeats,
		onShowDisqualified,
		onAutoAssign,
		onReset
	}: Props = $props();
</script>

{#snippet openBadge(option: Props['options'][number])}
	<span
		class="badge badge-xs {option.openGroups > option.openRoles
			? 'badge-warning'
			: 'badge-neutral'}"
		title={m.assignmentOpenGroupsAndRoles({ groups: option.openGroups, roles: option.openRoles })}
	>
		{option.openGroups}/{option.openRoles}
	</span>
{/snippet}

<div class="flex flex-wrap items-end gap-4">
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.assignmentGroupSize()}</legend>
		<div role="tablist" class="tabs tabs-box tabs-sm">
			{#each options as option (option.size)}
				<button
					role="tab"
					class="tab gap-1 {option.size === size ? 'tab-active' : ''}"
					aria-selected={option.size === size}
					onclick={() => onSize(option.size)}
				>
					{option.size}
					{#if option.openGroups > 0}
						{@render openBadge(option)}
					{/if}
				</button>
			{/each}
		</div>
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.assignmentRoleSeats()}</legend>
		<select
			class="select select-sm w-auto"
			value={seats}
			onchange={(e) => onSeats(Number(e.currentTarget.value))}
		>
			{#each options as option (option.size)}
				<option value={option.size}>{m.assignmentSeatsOption({ count: option.size })}</option>
			{/each}
		</select>
	</fieldset>
	<label class="label cursor-pointer gap-2 text-sm">
		<input
			type="checkbox"
			class="toggle toggle-sm"
			checked={showDisqualified}
			onchange={(e) => onShowDisqualified(e.currentTarget.checked)}
		/>
		{m.assignmentShowDisqualified()}
	</label>
	<div class="ml-auto flex gap-2">
		<button class="btn btn-primary btn-sm" disabled={busy || !canAutoAssign} onclick={onAutoAssign}>
			<i class="fa-duotone fa-wand-magic-sparkles"></i>
			{m.assignmentAutoAssign({ size })}
		</button>
		<button class="btn btn-ghost btn-sm" disabled={busy} onclick={onReset}>
			<i class="fa-duotone fa-rotate-left"></i>
			{m.assignmentResetSeats({ count: seats })}
		</button>
	</div>
</div>
