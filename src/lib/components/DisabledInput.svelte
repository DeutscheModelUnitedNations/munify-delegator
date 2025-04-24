<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		value: string;
	}

	let { value }: Props = $props();

	function copyToClipboard(content: string) {
		navigator.clipboard.writeText(content);
	}
</script>

<div class="flex w-full gap-2">
	<input
		type="text"
		class="input input-bordered flex-1"
		{value}
		readonly
		onfocus={(e) =>
			// @ts-expect-error select is a valid method
			e.target.select()}
		onclick={(e) =>
			// @ts-expect-error select is a valid method
			e.target.select()}
	/>
	<div class="tooltip tooltip-left" data-tip={m.copy()}>
		<button
			class="btn btn-ghost"
			onclick={() => copyToClipboard(value)}
			aria-label="Copy to clipboard"
		>
			<i class="fa-duotone fa-copy text-xl"></i>
		</button>
	</div>
</div>
