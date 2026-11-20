<!--
	@component
	One search over every block an audience can have: groups, committees, roles, survey answers and
	the team, by section. Choosing a block adds it and closes the list, choosing a picked one (checked) takes it out, and
	Backspace in the empty field takes out the last. A block whose people a picked one already holds
	stays in the list, greyed out, saying which.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Audience } from '#lib/helpers/announcements';
	import {
		canChoose,
		searchAudienceSections,
		type AudienceOption,
		type AudienceSection
	} from './audienceOptions';

	interface Props {
		sections: readonly AudienceSection[];
		onPick: (audience: Audience) => void;
		onRemove: (audience: Audience) => void;
		/** Backspace in the empty field: takes out the block picked last. */
		onRemoveLast: () => void;
	}

	let { sections, onPick, onRemove, onRemoveLast }: Props = $props();

	const listboxId = $props.id();
	let search = $state('');
	let open = $state(false);
	let active = $state(-1);

	const shown = $derived(searchAudienceSections({ sections, search }));
	/** Every shown block in order, so the arrow keys walk across the sections. */
	const flat = $derived(shown.flatMap((section) => section.options));
	const indexOf = $derived(new Map(flat.map((option, index) => [option.key, index])));

	/** The next block from `from` in `step`'s direction that can be chosen, or `from` itself. */
	function nextEnabled(from: number, step: 1 | -1) {
		for (let index = from + step; index >= 0 && index < flat.length; index += step)
			if (canChoose(flat[index])) return index;
		return from;
	}

	function choose(option: AudienceOption) {
		if (!canChoose(option)) return;
		if (option.picked) {
			// stays where it is, so a slip is undone with one more click
			onRemove(option.audience);
			return;
		}
		onPick(option.audience);
		// done with this one: the list closes, the field keeps focus for typing the next
		search = '';
		active = -1;
		open = false;
	}

	/** What a key does in the field; true when it was the list's, so the browser's default is not. */
	const keyActions: Record<string, () => boolean> = {
		ArrowDown: () => {
			open = true;
			active = nextEnabled(active, 1);
			return true;
		},
		ArrowUp: () => {
			active = nextEnabled(active, -1);
			return true;
		},
		Enter: () => {
			const option = open ? flat[active] : undefined;
			if (option) choose(option);
			return open;
		},
		Backspace: () => {
			if (search) return false;
			onRemoveLast();
			return true;
		},
		Escape: () => {
			if (!open) return false;
			open = false;
			return true;
		}
	};

	function onKeydown(event: KeyboardEvent) {
		if (keyActions[event.key]?.()) {
			event.preventDefault();
			// Escape closes the list, not the dialog around it
			event.stopPropagation();
		}
	}

	function onInput(text: string) {
		search = text;
		open = true;
		// the first block that can be picked, so Enter takes the best match
		active = nextEnabled(-1, 1);
	}
</script>

<div class="relative">
	<label class="input w-full">
		<i aria-hidden="true" class="ph-duotone ph-magnifying-glass opacity-60"></i>
		<input
			type="text"
			autocomplete="off"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-activedescendant={flat[active] ? `${listboxId}-${active}` : undefined}
			aria-label={m.announcementAudienceSearch()}
			placeholder={m.announcementAudienceSearch()}
			value={search}
			oninput={(event) => onInput(event.currentTarget.value)}
			onfocus={() => (open = true)}
			onclick={() => (open = true)}
			onblur={() => (open = false)}
			onkeydown={onKeydown}
			data-testid="audience-search"
		/>
	</label>

	{#if open}
		<div
			id={listboxId}
			role="listbox"
			aria-label={m.announcementAudience()}
			aria-multiselectable="true"
			class="bg-base-100 rounded-box border-base-content/10 absolute z-20 mt-1 max-h-80 w-full overflow-y-auto border p-1 shadow-lg"
		>
			{#each shown as section (section.key)}
				<div role="group" aria-labelledby="{listboxId}-{section.key}">
					<div
						id="{listboxId}-{section.key}"
						class="text-base-content/60 bg-base-100 sticky top-0 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide uppercase"
					>
						{section.label}
					</div>
					{#each section.options as option (option.key)}
						{@render optionRow(option)}
					{/each}
				</div>
			{:else}
				<p class="text-base-content/60 px-3 py-2 text-sm">
					{m.announcementAudienceNoMatch({ search })}
				</p>
			{/each}
		</div>
	{/if}
</div>

{#snippet optionRow(option: AudienceOption)}
	{@const index = indexOf.get(option.key) ?? -1}
	<!-- the field keeps focus; the pointer picks without taking it -->
	<div
		id="{listboxId}-{index}"
		role="option"
		tabindex="-1"
		aria-selected={option.picked}
		aria-disabled={!canChoose(option)}
		class={[
			'rounded-field flex items-center gap-2 px-3 py-1.5 text-sm',
			canChoose(option)
				? 'hover:bg-base-200 cursor-pointer'
				: 'text-base-content/40 cursor-not-allowed',
			option.picked && 'text-primary font-medium',
			index === active && 'bg-base-200 ring-base-content/20 ring-1 ring-inset'
		]}
		onmousedown={(event) => event.preventDefault()}
		onclick={() => choose(option)}
		onkeydown={() => {}}
		data-testid="audience-option"
	>
		<i
			aria-hidden="true"
			class={['ph-check text-base', option.picked ? 'ph-bold' : 'ph-bold invisible']}
		></i>
		<span class="min-w-0 flex-1 truncate">{option.label}</span>
		{#if option.coveredBy}
			<span class="shrink-0 text-xs">
				{m.announcementAudienceCoveredBy({ audience: option.coveredBy })}
			</span>
		{/if}
	</div>
{/snippet}
