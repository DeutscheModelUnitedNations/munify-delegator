<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, string | null | undefined> & FormPath<A> & keyof A, I extends FormPathLeaves<A, string | null | undefined> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		formFieldProxy
	} from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages.js';
	import FormField from './FormField.svelte';
	import { searchSchoolOptions, type SchoolOption } from './schoolOptions';

	/**
	 * The school of an application, a supervisor or a waiting list entry: a text field that
	 * suggests the schools already known, so people pick one rather than typing it once more. It
	 * fills two fields of the form - `idName` with the picked school's id, `name` with what the field
	 * shows - which is the `schoolId` / `schoolName` pair every mutation taking a school expects: a
	 * picked school, a name to find or create, or neither for no school, which is always allowed.
	 */
	interface Props {
		form: SuperForm<A, B>;
		/** The field holding the school's name as shown (`schoolName`). */
		name: N;
		/** The field holding the picked school's id (`schoolId`). */
		idName: I;
		label?: string;
		description?: string;
		disabled?: boolean;
	}

	let { form, name, idName, label, description, disabled = false }: Props = $props();

	const { value: schoolName } = $derived(
		formFieldProxy<A, N, string | null | undefined>(form, name)
	);
	const { value: schoolId } = $derived(
		formFieldProxy<A, I, string | null | undefined>(form, idName)
	);

	const listboxId = $props.id();

	let open = $state(false);
	let active = $state(-1);
	let search = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	/** Waits for a pause in typing before asking the server. */
	function searchSoon(text: string) {
		clearTimeout(timer);
		timer = setTimeout(() => (search = text), 250);
	}

	const options: SchoolOption[] = $derived(await searchSchoolOptions(search));

	const typed = $derived(($schoolName ?? '').trim());
	/** A suggestion named exactly what was typed, which is meant even if not picked. */
	const exactMatch = $derived(
		options.find((option) => option.name.toLowerCase() === typed.toLowerCase())
	);

	function pick(option: SchoolOption) {
		$schoolId = option.id;
		$schoolName = option.name;
		open = false;
		active = -1;
	}

	function clear() {
		$schoolId = null;
		$schoolName = null;
		search = '';
		open = false;
	}

	function onInput(text: string) {
		$schoolName = text || null;
		$schoolId = null;
		open = true;
		active = -1;
		searchSoon(text);
	}

	/** What a key does in the field; true when it was the list's, so the browser's default is not. */
	const keyActions: Record<string, () => boolean> = {
		ArrowDown: () => {
			open = true;
			active = Math.min(active + 1, options.length - 1);
			return true;
		},
		ArrowUp: () => {
			active = Math.max(active - 1, -1);
			return true;
		},
		Enter: () => {
			const option = open ? options[active] : undefined;
			if (option) pick(option);
			return !!option;
		},
		Escape: () => {
			open = false;
			return false;
		}
	};

	function onKeydown(event: KeyboardEvent) {
		if (keyActions[event.key]?.()) event.preventDefault();
	}

	/** What the field will save: a known school, a new one by the typed name, or none. */
	const outcome = $derived<'existing' | 'new' | 'none'>(
		$schoolId || (typed && exactMatch) ? 'existing' : typed ? 'new' : 'none'
	);

	function onBlur() {
		open = false;
		if (!$schoolId && exactMatch) pick(exactMatch);
	}
</script>

<FormField {form} {name} {label} {description} class="flex w-full flex-col text-left">
	{#snippet input({ props })}
		<div class="relative w-full">
			<div class="join w-full">
				<label class="input join-item w-full">
					<i class="fa-sharp-duotone fa-solid fa-school opacity-60"></i>
					<input
						{...props}
						type="text"
						autocomplete="off"
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={open && options.length > 0}
						aria-controls={listboxId}
						aria-activedescendant={options[active] ? `${listboxId}-${active}` : undefined}
						placeholder={m.schoolPickerPlaceholder()}
						value={$schoolName ?? ''}
						oninput={(event) => onInput(event.currentTarget.value)}
						onfocus={() => (open = true)}
						onblur={onBlur}
						onkeydown={onKeydown}
						{disabled}
					/>
				</label>
				<button
					type="button"
					class="btn join-item"
					onclick={clear}
					disabled={disabled || (!$schoolName && !$schoolId)}
					title={m.schoolPickerNoSchool()}
				>
					<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
					<span class="hidden sm:inline">{m.schoolPickerNoSchool()}</span>
				</button>
			</div>

			{#if open && options.length > 0}
				{@render suggestions()}
			{/if}
		</div>

		{@render status()}
	{/snippet}
</FormField>

{#snippet suggestions()}
	<ul
		id={listboxId}
		role="listbox"
		class="menu bg-base-100 rounded-box border-base-300 absolute z-20 mt-1 w-full border shadow-lg"
	>
		{#each options as option, index (option.id)}
			<li role="option" id="{listboxId}-{index}" aria-selected={index === active}>
				<button
					type="button"
					class={index === active ? 'menu-active' : ''}
					tabindex="-1"
					onmousedown={(event) => event.preventDefault()}
					onclick={() => pick(option)}
				>
					<span>{option.name}</span>
					{#if option.city}
						<span class="text-base-content/60 text-xs">{option.city}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet status()}
	<p class="text-base-content/70 mt-1 text-xs" aria-live="polite">
		{#if outcome === 'existing'}
			<i class="fa-sharp-duotone fa-solid fa-check text-success"></i>
			{m.schoolPickerExisting()}
		{:else if outcome === 'new'}
			<i class="fa-sharp-duotone fa-solid fa-plus"></i>
			{m.schoolPickerNewSchool({ name: typed })}
		{:else}
			{m.schoolPickerNone()}
		{/if}
	</p>
{/snippet}
