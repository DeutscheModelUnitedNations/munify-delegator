<script lang="ts">
	import Row from './ui/Row.svelte';

	/** Something the person wrote, as they wrote it, as a row of a `Section`. */
	interface Props {
		/** Phosphor icon name (without the `ph-` prefix) */
		icon: string;
		title: string;
		text: string;
	}

	let { icon, title, text }: Props = $props();
</script>

<Row {icon} {title}>
	<p class="max-w-prose whitespace-pre-wrap select-text">{text}</p>
</Row>
