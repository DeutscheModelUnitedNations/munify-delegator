<!--
	@component
	The functions dialog's switches for the custom roles (the press, …): whoever looks after a role
	answers its inbox and is in its group.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import FunctionToggle from './FunctionToggle.svelte';

	interface Props {
		roles: readonly { id: string; name: string | null; icon: string | null }[];
		teamMemberId: string;
		/** The id of the member's support of the role, while they hold it */
		heldIdOf: (roleId: string) => string | undefined;
	}

	let { roles, teamMemberId, heldIdOf }: Props = $props();
</script>

<h3 class="mt-4 mb-1 font-semibold">{m.teamFunctionsRoles()}</h3>
<p class="text-base-content/70 mb-2 text-sm">{m.teamFunctionRoleSupportExplanation()}</p>
{#if roles.length === 0}
	<p class="text-base-content/60">{m.teamFunctionsNoRoles()}</p>
{:else}
	<ul class="flex flex-col gap-1" data-testid="team-functions-roles">
		{#each roles as role (role.id)}
			{@const label = m.chatInboxRoleSupport({ role: role.name ?? m.chatUnknownRole() })}
			<li>
				<label
					class="hover:bg-base-200 flex cursor-pointer items-center gap-3 rounded-box px-2 py-1.5"
				>
					<FunctionToggle
						{teamMemberId}
						kind="ROLE_SUPPORT"
						roleId={role.id}
						heldId={heldIdOf(role.id)}
						{label}
					/>
					<i aria-hidden="true" class="ph-duotone ph-{role.icon ?? 'user-focus'} text-lg"></i>
					<span>{label}</span>
				</label>
			</li>
		{/each}
	</ul>
{/if}
