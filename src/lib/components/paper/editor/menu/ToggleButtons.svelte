<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Button from './Button.svelte';
	import { toggles, type ToggleName } from './toggles';

	interface Props {
		editor: Editor;
		/** The toggles to show, in this order. */
		items: ToggleName[];
	}

	let { editor, items }: Props = $props();
</script>

{#each items as item (item)}
	{@const toggle = toggles[item]}
	<Button
		onClick={() => toggle.toggle(editor)}
		active={toggle.isActive(editor)}
		label={toggle.label()}
		icon={toggle.icon}
	/>
{/each}
