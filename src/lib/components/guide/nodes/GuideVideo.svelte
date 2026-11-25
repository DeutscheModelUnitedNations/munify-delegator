<script lang="ts">
	import GuideEmbed from '../GuideEmbed.svelte';
	import type { GuideNode } from '#lib/guide/document';

	let { node }: { node: GuideNode } = $props();
</script>

<GuideEmbed url={typeof node.attrs?.url === 'string' ? node.attrs.url : ''} />
