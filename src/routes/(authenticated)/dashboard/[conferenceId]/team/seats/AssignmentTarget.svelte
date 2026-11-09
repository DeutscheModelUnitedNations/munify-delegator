<script lang="ts">
	import type { UserPreview } from './userPreview';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';

	interface Props {
		user: Partial<UserPreview> | undefined;
		loading: boolean;
		alreadyInConference: boolean;
		targetRole: string;
	}

	let { user, loading, alreadyInConference, targetRole }: Props = $props();
</script>

<div class="bg-base-200 flex w-full flex-col items-center justify-center gap-1 rounded-box p-4">
	{#if loading}
		<div>
			<i class="ph-duotone ph-spinner-gap animate-spin"></i>
		</div>
	{:else if user}
		{#if alreadyInConference}
			<div class="badge badge-warning">
				<i class="ph-duotone ph-check-circle"></i>
				{m.alreadyInConference()}
			</div>
		{/if}
		<div class="badge badge-success">
			{formatNames({
				givenName: user.given_name ?? undefined,
				familyName: user.family_name ?? undefined
			})} ({user.email})
		</div>
	{:else}
		<div class="badge badge-error">{m.userNotFound()}</div>
	{/if}
	<i class="ph-duotone ph-arrow-down"></i>
	<div class="badge badge-primary">{targetRole}</div>
</div>
