<script lang="ts">
	import ToneIcon from './ToneIcon.svelte';

	/** Says that a section has nothing to show. */
	interface Props {
		icon: string;
		text: string;
	}

	let { icon, text }: Props = $props();
</script>

<p class="text-base-content/60 flex items-center gap-3 py-1.5 text-sm">
	<ToneIcon {icon} />
	{text}
</p>
