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
	<span class="flex items-center gap-1">
		<a {href} class="link link-hover flex items-center gap-1.5" aria-label="{label}: {value}">
			<i class="fa-sharp-duotone fa-solid {icon} text-xs"></i>
			{value}
		</a>
		<button
			class="btn btn-ghost btn-xs btn-square"
			onclick={() => copy(value)}
			aria-label="{m.copy()}: {label}"
			title={m.copy()}
		>
			<i class="fa-sharp-duotone fa-solid fa-copy text-xs"></i>
		</button>
	</span>
{/snippet}

<div class="text-base-content/70 flex flex-wrap items-center gap-x-4 text-sm">
	{@render entry('fa-envelope', contact.email, `mailto:${contact.email}`, m.email())}
	{#if contact.phone}
		{@render entry('fa-phone', contact.phone, `tel:${contact.phone}`, m.phoneNumber())}
	{/if}
</div>
