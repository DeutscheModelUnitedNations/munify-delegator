<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import CopyValue from './CopyValue.svelte';

	/**
	 * One detail of a person as a row of a `<dl class="grid …">`: what it is and its value, which a
	 * click copies (or `href` opens). Nothing entered reads as missing only where the reader sees
	 * everything (`readsWholePerson`) and it `matters`; otherwise it reads as no information.
	 */
	interface Props {
		label: string;
		/** What is shown and copied: the text, not a stored code */
		value?: string | null;
		/** Where the value leads, such as `mailto:` */
		href?: string;
		mono?: boolean;
		/** An empty value is a gap somebody has to close */
		matters?: boolean;
		/** Shown instead of the value */
		children?: Snippet;
	}

	let { label, value, href, mono = false, matters = false, children }: Props = $props();
</script>

<div class="grid grid-cols-[7.25rem_minmax(0,1fr)] items-start gap-x-3">
	<dt class="text-base-content/60 text-sm hyphens-auto">{label}</dt>
	<dd class="min-w-0 text-sm wrap-anywhere">
		{#if children}
			{@render children()}
		{:else if value?.trim()}
			<CopyValue {value} {href} {mono} {label} />
		{:else if matters}
			<span class="text-warning">{m.userCardMissing()}</span>
		{:else}
			<span class="text-base-content/60 italic">{m.noStatement()}</span>
		{/if}
	</dd>
</div>
