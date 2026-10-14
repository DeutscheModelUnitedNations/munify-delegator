<script lang="ts">
	import type { UserPreview } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';

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
			<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
		</div>
	{:else if user}
		{#if alreadyInConference}
			<div class="badge badge-warning">
				<i class="fa-sharp-duotone fa-solid fa-circle-check"></i>
				{m.alreadyInConference()}
			</div>
		{/if}
		<div class="badge badge-success">
			{formatNames(user.given_name ?? undefined, user.family_name ?? undefined)} ({user.email})
		</div>
	{:else}
		<div class="badge badge-error">{m.userNotFound()}</div>
	{/if}
	<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
	<div class="badge badge-primary">{targetRole}</div>
</div>
