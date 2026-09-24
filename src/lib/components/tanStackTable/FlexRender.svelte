<script lang="ts" generics="TContext">
	import { RenderComponentConfig, RenderSnippetConfig } from './renderHelpers';

	interface Props {
		content?: string | ((ctx: TContext) => unknown) | undefined;
		context: TContext;
	}

	let { content, context }: Props = $props();
</script>

{#if typeof content === 'string'}
	{content}
{:else if typeof content === 'function'}
	{@const result = content(context)}
	{#if result instanceof RenderComponentConfig}
		{@const Component = result.component}
		<Component {...result.props} />
	{:else if result instanceof RenderSnippetConfig}
		{@render result.snippet(result.params)}
	{:else}
		{result}
	{/if}
{/if}
