<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';

	/** The person's email and phone, to write, call or copy without opening a tab. */
	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	// The phone is masked for readers who may not see it, and then comes back empty.
	const contact = $derived(
		await client.liveQuery.user({ __args: { id: userId }, id: true, email: true, phone: true })
	);

	const copy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		toast.success(m.codeCopied());
	};
</script>

{#snippet entry(icon: string, value: string, href: string, label: string)}
	<!-- The copy button shows on hover or focus, so the line reads as plain contact details -->
	<span class="group flex min-w-0 items-center gap-0.5">
		<a
			{href}
			class="link link-hover flex min-w-0 items-center gap-1.5 break-all"
			aria-label="{label}: {value}"
		>
			<i class="fa-sharp-duotone fa-solid {icon} text-xs"></i>
			{value}
		</a>
		<!-- A touch screen has no hover, so there it shows faintly all the time -->
		<button
			class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60"
			onclick={() => copy(value)}
			aria-label="{m.copy()}: {label}"
			title={m.copy()}
		>
			<i class="fa-sharp-duotone fa-solid fa-copy text-xs"></i>
		</button>
	</span>
{/snippet}

<div class="text-base-content/60 flex flex-wrap items-center gap-x-3 text-sm">
	{@render entry('fa-envelope', contact.email, `mailto:${contact.email}`, m.email())}
	{#if contact.phone}
		{@render entry('fa-phone', contact.phone, `tel:${contact.phone}`, m.phoneNumber())}
	{/if}
</div>
