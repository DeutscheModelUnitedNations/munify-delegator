<script lang="ts">
	import { Description } from 'formsnap';

	interface Props {
		description?: string;
	}

	let { description }: Props = $props();
</script>

{#if description}
	<!--
		Formsnap's Description registers its id with the surrounding Field, which is how the control
		ends up pointing at this text through `aria-describedby`.
	-->
	<Description class="label-text mb-2 max-w-[50ch] text-xs">
		{description}
	</Description>
{/if}
