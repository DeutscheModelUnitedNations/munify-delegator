<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';
	import { sightingHref } from '../sightingLink';

	/** The single participants applying the draft gives a different role, before and after. */
	interface Props {
		singles: { singleParticipantId: string; liveRoleId: string | null; roleId: string | null }[];
		customRoleName: (roleId: string | null) => string;
		/** The icon a custom role is shown with, if it has one. */
		customRoleIcon: (roleId: string | null) => string | undefined;
		conferenceId: string;
	}

	let { singles, customRoleName, customRoleIcon, conferenceId }: Props = $props();
</script>

{#snippet role(roleId: string | null)}
	{@const icon = customRoleIcon(roleId)}
	<span class="inline-flex items-center gap-2">
		{#if icon}
			<Flag nsa {icon} size="xs" />
		{/if}
		{customRoleName(roleId)}
	</span>
{/snippet}

<div class="overflow-x-auto">
	<table class="table-sm table">
		<thead>
			<tr>
				<th>{m.singleParticipants()}</th>
				<th>{m.assignmentFrom()}</th>
				<th>{m.assignmentTo()}</th>
			</tr>
		</thead>
		<tbody>
			{#each singles as single (single.singleParticipantId)}
				<tr>
					<td>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved in sightingHref -->
						<a
							class="link link-hover"
							href={sightingHref(conferenceId, single.singleParticipantId)}
							title={m.assignmentCardSighting()}
						>
							{codenamize(single.singleParticipantId)}
						</a>
					</td>
					<td>{@render role(single.liveRoleId)}</td>
					<td>{@render role(single.roleId)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
