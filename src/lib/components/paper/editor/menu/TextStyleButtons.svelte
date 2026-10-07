<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Divider from './Divider.svelte';
	import ToggleButtons from './ToggleButtons.svelte';

	let { editor }: { editor: Editor } = $props();
</script>

<ToggleButtons {editor} items={['heading2', 'heading3']} />
<Divider />
<ToggleButtons {editor} items={['bold', 'italic', 'underline']} />
