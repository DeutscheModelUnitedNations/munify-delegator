<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { ParticipationRole } from './types';

	interface Props {
		role: ParticipationRole;
	}

	let { role }: Props = $props();

	const roleBadges: Record<
		ParticipationRole,
		{ label: () => string; icon: string; color: string }
	> = {
		DELEGATION_MEMBER: {
			label: m.delegationMember,
			icon: 'fa-users-viewfinder',
			color: 'badge-primary'
		},
		SINGLE_PARTICIPANT: { label: m.singleParticipant, icon: 'fa-user', color: 'badge-accent' },
		SUPERVISOR: { label: m.supervisor, icon: 'fa-chalkboard-user', color: 'badge-success' },
		TEAM_MEMBER: { label: m.teamMember, icon: 'fa-user-group', color: 'badge-info' }
	};

	const config = $derived(roleBadges[role]);
</script>

<span class="badge {config.color} badge-soft badge-sm gap-1">
	<i class="fa-sharp-duotone fa-solid {config.icon}"></i>
	{config.label()}
</span>
