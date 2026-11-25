<script lang="ts" module>
	export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

	export interface StatusOption<S> {
		value: S;
		label: string;
		/** What the state reads as where it is shown, if the label is too long for that */
		short?: string;
		icon?: string;
		tone: StatusTone;
	}
</script>

<script lang="ts" generics="S">
	import ToneIcon from './ToneIcon.svelte';

	/**
	 * A state with its icon, which opens the list of states to change it. What still needs somebody
	 * (`warning`, `error`) stands on its color.
	 */
	interface Props {
		/** What the state is of */
		name: string;
		active: S;
		options: StatusOption<S>[];
		disabled?: boolean;
		onSelect: (value: S) => void;
	}

	let { name, active, options, disabled = false, onSelect }: Props = $props();

	const current = $derived(options.find((option) => option.value === active));
	const tone = $derived(current?.tone ?? 'neutral');
	const open = $derived(tone === 'warning' || tone === 'error');

	/** Settled and neutral ones stay plain */
	const toneSurface: Record<StatusTone, string> = {
		success: '',
		neutral: '',
		warning: 'bg-warning/15',
		error: 'bg-error/15'
	};

	let anchor = $state<HTMLButtonElement>();
	let popover = $state<HTMLDivElement>();
	let position = $state('top: 0px; left: 0px;');

	const popoverId = $props.id();
	const MENU_WIDTH = 256;
	/** Room the menu wants below the state before it opens above instead */
	const MENU_ROOM = 200;

	// In the top layer, so the scrolling card cannot cut it off; placed against the viewport
	function place(event: ToggleEvent) {
		if (event.newState !== 'open' || !anchor) return;
		const rect = anchor.getBoundingClientRect();
		const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8));
		position =
			window.innerHeight - rect.bottom >= MENU_ROOM
				? `top: ${rect.bottom + 4}px; left: ${left}px;`
				: `top: auto; bottom: ${window.innerHeight - rect.top + 4}px; left: ${left}px;`;
	}

	function select(value: S) {
		popover?.hidePopover?.();
		if (value !== active) onSelect(value);
	}

	const entries = () => [...(popover?.querySelectorAll<HTMLButtonElement>('button') ?? [])];

	function focusCurrent(event: ToggleEvent) {
		if (event.newState !== 'open') return;
		const shown = options.findIndex((option) => option.value === active);
		entries()[Math.max(0, shown)]?.focus();
	}

	/** Arrow keys move through the states; Escape closes the menu alone, not the card around it. */
	function keys(node: HTMLElement) {
		function onKeydown(event: KeyboardEvent) {
			if (!popover?.matches(':popover-open')) return;
			if (event.key === 'Escape') {
				event.stopPropagation();
				popover.hidePopover();
				anchor?.focus();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				const all = entries();
				const at = all.findIndex((entry) => entry === document.activeElement);
				const step = event.key === 'ArrowDown' ? 1 : -1;
				all.at((at + step) % all.length)?.focus();
			}
		}
		node.addEventListener('keydown', onKeydown);
		return () => node.removeEventListener('keydown', onKeydown);
	}
</script>

<button
	bind:this={anchor}
	type="button"
	class={[
		'rounded-field flex cursor-pointer items-center gap-1.5 py-0.5 pr-1.5 text-left text-sm transition-colors',
		open ? ['pl-2 font-bold', toneSurface[tone]] : 'hover:bg-base-content/10 -ml-2 pl-2'
	]}
	aria-label="{name}: {current?.label}"
	{disabled}
	popovertarget={popoverId}
	{@attach keys}
>
	{#if current}
		{#if current.icon}
			<ToneIcon icon={current.icon} {tone} small />
		{/if}
		{current.short ?? current.label}
	{/if}
	<i aria-hidden="true" class="ph ph-caret-down text-base-content/60 text-[0.625rem]"></i>
</button>

<div
	bind:this={popover}
	id={popoverId}
	popover="auto"
	role="group"
	aria-label={name}
	onbeforetoggle={place}
	ontoggle={focusCurrent}
	class="state-menu bg-base-100 text-base-content border-base-content/20 rounded-box m-0 max-w-64 min-w-44 border p-1 shadow-xl"
	style={position}
	{@attach keys}
>
	<ul class="flex flex-col gap-0.5">
		{#each options as option (option.value)}
			{@const shown = option.value === active}
			<li>
				<button
					type="button"
					class={[
						'hover:bg-base-content/10 focus-visible:bg-base-content/10 rounded-field flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left text-sm',
						shown && 'font-bold',
						shown && 'bg-base-content/5'
					]}
					aria-pressed={shown}
					{disabled}
					onclick={() => select(option.value)}
				>
					<!-- Nothing recorded has no icon of its own -->
					<ToneIcon icon={option.icon ?? 'empty'} tone={option.tone} small />
					<span class="flex-1">{option.label}</span>
					{#if shown}
						<i aria-hidden="true" class="ph ph-check text-xs"></i>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	/* Grows out of the state it changes; `allow-discrete` keeps it shown while it fades out */
	.state-menu {
		opacity: 0;
		scale: 0.96;
		transform-origin: top left;
		transition:
			opacity 120ms ease-out,
			scale 120ms ease-out,
			display 120ms allow-discrete,
			overlay 120ms allow-discrete;
	}

	.state-menu:popover-open {
		opacity: 1;
		scale: 1;
	}

	@starting-style {
		.state-menu:popover-open {
			opacity: 0;
			scale: 0.96;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.state-menu {
			transition: none;
		}
	}
</style>
