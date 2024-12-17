<script lang="ts">
	import mermaid from 'mermaid';

	interface Props {
		diagram: string;
	}

	let { diagram }: Props = $props();

	let container = $state<HTMLSpanElement>();

	async function renderDiagram() {
		const { svg } = await mermaid.render('mermaid', diagram);
		if (!container) return;
		container.innerHTML = svg;
	}

	$effect(() => {
		if (diagram) {
			renderDiagram();
		}
	});
</script>

<span class="w-full" bind:this={container}></span>
