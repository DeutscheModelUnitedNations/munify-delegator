<script lang="ts">
	interface Props {
		title: string;
		text: string;
		class?: string;
	}

	let { title, text, class: className = '' }: Props = $props();
</script>

<div class="bg-base-200 rounded-box flex flex-col gap-1 px-4 py-3 {className}">
	<h4 class="text-base-content/60 text-xs font-semibold tracking-wide uppercase">{title}</h4>
	<p class="text-sm leading-relaxed whitespace-pre-wrap select-text">{text}</p>
</div>
