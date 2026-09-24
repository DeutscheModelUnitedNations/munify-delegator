<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { SuperForm } from 'sveltekit-superforms';

	interface Props {
		form: SuperForm<A, B>;
		name: string;
	}

	let { form, name }: Props = $props();

	let { form: formData, constraints: formConstraints } = form;
	let constraints = $derived($formConstraints[name]);
</script>

{#if constraints?.maxlength}
	<div class="text-base-content/60 w-full text-right text-[0.6rem]">
		{($formData[name] as string | undefined | null)?.length ?? 0} / {constraints?.maxlength}
	</div>
{/if}
