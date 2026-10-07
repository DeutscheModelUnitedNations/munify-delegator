<script lang="ts">
	interface Props {
		title: string;
		text: string;
		class?: string;
	}

	let { title, text, class: className = '' }: Props = $props();
</script>

<div class={className}>
	<h3 class="mb-1 text-lg font-bold">{title}</h3>
	<blockquote
		class="border-base-content/20 bg-base-200 select-text rounded-r-lg border-l-4 p-3 text-sm whitespace-pre-wrap italic"
	>
		{text}
	</blockquote>
</div>
