<script lang="ts">
	import mermaid from 'mermaid';

	interface Props {
		diagram: string;
	}

	let { diagram }: Props = $props();

	let svg = $state('');

	/**
	 * Mermaid only knows Font Awesome: `fa:fa-flag` in a label becomes `<i class='fa fa-flag'>`.
	 * The app has Phosphor, so those become `ph-duotone ph-flag`.
	 */
	function phosphorIcons(rendered: string) {
		return rendered.replace(
			/class=(['"])fa fa-([\w-]+)\1/g,
			'class="ph-duotone ph-$2" aria-hidden="true"'
		);
	}

	async function renderDiagram() {
		const rendered = await mermaid.render('mermaid', diagram);
		svg = phosphorIcons(rendered.svg);
	}

	$effect(() => {
		if (diagram) {
			renderDiagram();
		}
	});
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: SVG mermaid renders from a developer-authored diagram (its only caller passes a literal built from translation strings) -->
<span class="w-full">{@html svg}</span>
