<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	/** A value a click copies. One that leads somewhere is a link with the copy button beside it. */
	interface Props {
		value: string;
		/** Copied instead of the value */
		copyText?: string;
		href?: string;
		mono?: boolean;
		/** What the value is, for the copy button of a link */
		label: string;
	}

	let { value, copyText = value, href, mono = false, label }: Props = $props();

	const copy = async () => {
		await navigator.clipboard.writeText(copyText);
		toast.success(m.codeCopied());
	};
</script>

{#if href}
	<!-- The copy button sits in the corner of the `Fact` and shows on hover or focus; a touch screen has
	     no hover, so there faintly always -->
	<span class="group">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a mailto: or tel: link -->
		<a {href} class="link link-hover">{value}</a>
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-square absolute -top-1 right-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60"
			onclick={copy}
			aria-label="{m.copy()}: {label}"
			title={m.copy()}
		>
			<i aria-hidden="true" class="ph-duotone ph-copy text-xs"></i>
		</button>
	</span>
{:else}
	<button
		type="button"
		class="max-w-full text-left whitespace-pre-line decoration-dotted underline-offset-2 hover:underline {mono
			? 'font-mono'
			: ''}"
		onclick={copy}
		title={m.copy()}
	>
		{value}
	</button>
{/if}
