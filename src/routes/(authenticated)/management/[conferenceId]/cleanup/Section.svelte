<script lang="ts">
	import { graphql } from '$houdini';

	const cleanup = graphql(`
    mutation cleanup($conferenceId: String!) {
      cleanup(conferenceId: $conferenceId) {
      }
    }
  `);

	interface Props {
		title: string;
		description: string;
		btnText: string;
		action: () => Promise<void>;
	}

	let { title, description, btnText, action }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xl font-bold">{title}</h3>
	<p>{@html description}</p>
	<button class="btn btn-primary max-w-md" onclick={action}>{btnText}</button>
</div>
