<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';

	/** A value to type into a device, with its name and a button to copy it. */
	interface Props {
		label: string;
		value: string;
	}

	let { label, value }: Props = $props();

	async function copy() {
		await navigator.clipboard.writeText(value);
		toast.success(m.codeCopied());
	}
</script>

<div class="flex items-center gap-2 text-sm">
	<span class="w-32 shrink-0 opacity-70">{label}</span>
	<code class="min-w-0 break-all">{value}</code>
	<button
		type="button"
		class="btn btn-ghost btn-xs btn-square"
		onclick={copy}
		aria-label="{m.copy()}: {label}"
		title={m.copy()}
	>
		<i aria-hidden="true" class="ph-duotone ph-copy"></i>
	</button>
</div>
