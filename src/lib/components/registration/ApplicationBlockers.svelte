<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { AgeIssue, ProfileField } from '#lib/api/rumbleClient/client';
	import { applicationBlockerTexts } from '#lib/helpers/applicationBlockers';
	import ProfileLink from '#lib/components/ProfileLink.svelte';
	import formatNames from '#lib/helpers/formatNames';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';

	/**
	 * Who of an application the plausibility checks find something about, and what (the
	 * `applicationBlockers` field), which keeps it from being sent. The signed-in person is led to
	 * their profile; everyone else has to complete their own.
	 */
	interface Props {
		blockers: {
			userId: string;
			ageIssue: AgeIssue | null;
			invalidFields: ProfileField[];
			user: { givenName: string; familyName: string } | null;
		}[];
		/** What is held back, where it is not an application (a supervisor attending in person). */
		title?: string;
		description?: string;
		/** Spacing around the notice, only there while it is shown. */
		class?: string;
	}

	let {
		blockers,
		title = m.applicationBlockersTitle(),
		description = m.applicationBlockersDescription(),
		class: className = ''
	}: Props = $props();

	const currentUser = await getCurrentUser();

	const anyAgeIssue = $derived(blockers.some((blocker) => blocker.ageIssue));
</script>

<div
	id="application-blockers"
	role="alert"
	class="alert bg-error/10 border-error/30 items-start {className}"
	data-testid="application-blockers"
>
	<i aria-hidden="true" class="ph-duotone ph-user-circle-minus text-error mt-0.5 text-xl"></i>
	<div class="flex w-full flex-col gap-2">
		<p class="font-semibold">{title}</p>
		<p class="text-sm">{description}</p>
		<ul class="flex flex-col gap-2">
			{#each blockers as blocker (blocker.userId)}
				{@const own = blocker.userId === currentUser.sub}
				<li class="bg-base-100 rounded-box flex flex-col gap-1 p-3 text-sm">
					<p>
						<span class="font-semibold">
							{blocker.user
								? formatNames({
										givenName: blocker.user.givenName,
										familyName: blocker.user.familyName
									})
								: m.applicationBlockersUnknownPerson()}
							{#if own}({m.you()}){/if}:
						</span>
						{applicationBlockerTexts(blocker).join('; ')}
					</p>
					{#if blocker.invalidFields.length > 0}
						{#if own}
							<ProfileLink class="btn btn-sm btn-primary self-start" label={m.completeData()} />
						{:else}
							<p class="text-base-content/70 text-xs">{m.applicationBlockersOthersProfile()}</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
		{#if anyAgeIssue}
			<p class="text-sm">{m.applicationBlockersAgeHint()}</p>
		{/if}
	</div>
</div>
