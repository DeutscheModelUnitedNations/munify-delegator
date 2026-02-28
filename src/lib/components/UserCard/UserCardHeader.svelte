<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		roleIcon?: string;
		roleLabel?: string;
		loading?: boolean;
		mode: 'drawer' | 'page';
		onClose?: () => void;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		roleIcon,
		roleLabel,
		loading = false,
		mode,
		onClose
	}: Props = $props();

	let displayName = $derived(
		formatNames(givenName ?? undefined, familyName ?? undefined, {
			givenNameFirst: false
		})
	);

	let fullPageUrl = $derived(`/management/${conferenceId}/user/${userId}`);
</script>

<div class="flex items-center gap-3 px-5 pt-3 pb-2">
	{#if loading}
		<div class="flex flex-1 items-center gap-3">
			<div class="skeleton h-6 w-48"></div>
			<div class="skeleton h-4 w-24"></div>
		</div>
	{:else}
		<div class="flex flex-1 flex-wrap items-center gap-2">
			<h2 class="text-lg font-bold">{displayName}</h2>
			{#if pronouns}
				<span class="text-base-content/60 text-sm">({pronouns})</span>
			{/if}
			{#if roleIcon && roleLabel}
				<div class="tooltip" data-tip={roleLabel}>
					<i class="fa-duotone fa-{roleIcon} text-primary"></i>
				</div>
			{/if}
		</div>
		{#if mode === 'drawer'}
			<a
				href={fullPageUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-ghost btn-sm btn-square"
				title={m.userCardOpenFullPage()}
			>
				<i class="fa-duotone fa-arrow-up-right-from-square"></i>
			</a>
		{/if}
	{/if}
	{#if mode === 'drawer' && onClose}
		<button class="btn btn-ghost btn-sm btn-square" onclick={onClose} aria-label="Close">
			<i class="fa-solid fa-xmark"></i>
		</button>
	{/if}
</div>
