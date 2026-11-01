<script lang="ts">
	import mermaid from 'mermaid';

	interface Props {
		diagram: string;
	}

	let { diagram }: Props = $props();

	let svg = $state('');

	async function renderDiagram() {
		const rendered = await mermaid.render('mermaid', diagram);
		svg = rendered.svg;
	}

	$effect(() => {
		if (diagram) {
			renderDiagram();
		}
	});
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: SVG mermaid renders from a developer-authored diagram (its only caller passes a literal built from translation strings) -->
<span class="w-full">{@html svg}</span>
