<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import Row from '../ui/Row.svelte';
	import type { Tone } from '../ui/ToneIcon.svelte';

	/**
	 * A number or code as a row of a `Section`: text with a pencil, which a field takes the place of
	 * while it is edited.
	 */
	interface Props {
		icon: string;
		title: string;
		value?: string;
		/** Reads instead of the value where there is none */
		empty?: string;
		/** What the value is for, on hover */
		hint?: string;
		tone?: Tone;
		/** A whole number */
		numeric?: boolean;
		/** Never empty: neither number can be taken away again */
		onSave: (value: string) => Promise<void>;
		/** Beside the value */
		actions?: Snippet;
	}

	let {
		icon,
		title,
		value,
		empty = '–',
		hint,
		tone,
		numeric = false,
		onSave,
		actions
	}: Props = $props();

	let editing = $state(false);
	/** Not the first time the value shows, so the focus goes back to its pencil */
	let edited = false;
	let draft = $state('');
	let saving = $state(false);

	function edit() {
		draft = value ?? '';
		edited = true;
		editing = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		try {
			await onSave(draft.trim());
			editing = false;
		} catch {
			// Said by whoever saves; the field stays open to try again
		} finally {
			saving = false;
		}
	}

	/** Focuses the field; Escape leaves it alone, not the card around it. */
	function field(node: HTMLInputElement) {
		function onKeydown(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			editing = false;
		}
		node.select();
		node.addEventListener('keydown', onKeydown);
		return () => node.removeEventListener('keydown', onKeydown);
	}
</script>

<Row {icon} {title} {tone} {actions}>
	<!-- The field takes the place of the text, in its size, so nothing around it moves -->
	{#if editing}
		<form class="flex items-center gap-1" onsubmit={save}>
			<input
				class="field-sizing-content border-primary -mb-0.5 h-5.5 max-w-40 min-w-16 border-0 border-b-2 bg-transparent p-0 font-mono text-sm tracking-wider outline-none"
				type="text"
				inputmode={numeric ? 'numeric' : undefined}
				pattern={numeric ? '[1-9][0-9]*' : undefined}
				required
				value={draft}
				oninput={(event) => (draft = event.currentTarget.value)}
				aria-label={title}
				{@attach field}
			/>
			<button
				class="btn btn-ghost btn-xs btn-square text-primary -my-2 text-base"
				type="submit"
				disabled={saving}
				aria-label={m.save()}
				title={m.save()}
			>
				<i aria-hidden="true" class={saving ? 'ph-fill ph-spinner-gap animate-spin' : 'ph ph-check'}
				></i>
			</button>
			<button
				class="btn btn-ghost btn-xs btn-square -my-2 text-base"
				type="button"
				onclick={() => (editing = false)}
				aria-label={m.a11yExitEditing()}
				title={m.a11yExitEditing()}
			>
				<i aria-hidden="true" class="ph ph-x"></i>
			</button>
		</form>
	{:else}
		<span class="flex items-center gap-1">
			<span class={value ? 'font-mono tracking-wider' : 'text-base-content/60'} title={hint}>
				{value ?? empty}
			</span>
			<button
				class="btn btn-ghost btn-xs btn-square -my-2 text-base"
				onclick={edit}
				aria-label="{title}: {m.edit()}"
				title={m.edit()}
				{@attach (node) => {
					if (edited) node.focus();
				}}
			>
				<i aria-hidden="true" class="ph-duotone ph-pencil-simple"></i>
			</button>
		</span>
	{/if}
</Row>
