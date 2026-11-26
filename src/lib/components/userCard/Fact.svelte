<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import CopyValue from './CopyValue.svelte';

	/**
	 * One detail of a person in a `<dl>`: an icon, what it is and its value below, which a click
	 * copies (or `href` opens). Nothing entered reads as missing only where the reader sees everything
	 * (`readsWholePerson`) and it `matters`; otherwise it reads as no information.
	 */
	interface Props {
		label: string;
		/** Phosphor icon name (without the `ph-` prefix) */
		icon: string;
		/** What is shown and copied: the text, not a stored code */
		value?: string | null;
		/** Copied instead of the value */
		copyText?: string;
		/** Where the value leads, such as `mailto:` */
		href?: string;
		mono?: boolean;
		/** An empty value is a gap somebody has to close */
		matters?: boolean;
		/** What is wrong with the value, below it */
		hint?: string;
		class?: string;
		/** Beside the value */
		extra?: Snippet;
		/** Shown instead of the value */
		children?: Snippet;
	}

	let {
		label,
		icon,
		value,
		copyText,
		href,
		mono = false,
		matters = false,
		hint,
		class: className = '',
		extra,
		children
	}: Props = $props();

	const missing = $derived(matters && !children && !value?.trim());
</script>

<div class="relative min-w-0 pl-8 {className}">
	<dt class="text-base-content/60 text-xs">
		<i
			aria-hidden="true"
			class="ph-duotone ph-{icon} absolute top-1.5 left-0 text-xl {missing
				? 'text-warning'
				: 'text-primary'}"
		></i>
		{label}
	</dt>
	<dd class="mt-0.5 text-[0.95rem] leading-snug wrap-anywhere">
		{#if children}
			{@render children()}
		{:else if value?.trim()}
			<CopyValue {value} {copyText} {href} {mono} {label} />
			{@render extra?.()}
		{:else if missing}
			<span class="badge badge-warning badge-sm">{m.userCardMissing()}</span>
		{:else}
			<span class="text-base-content/60">{m.noStatement()}</span>
		{/if}
		{#if hint}
			<span class="block text-xs">
				<i aria-hidden="true" class="ph-duotone ph-warning text-warning"></i>
				{hint}
			</span>
		{/if}
	</dd>
</div>
