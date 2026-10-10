<script lang="ts">
	import Markdown from '@magidoc/plugin-svelte-marked';

	interface Props {
		source: string;
	}

	let { source }: Props = $props();
</script>

<Markdown {source} />
