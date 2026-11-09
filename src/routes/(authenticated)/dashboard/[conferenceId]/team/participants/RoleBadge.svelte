<script lang="ts">
	import { m } from '#lib/paraglide/messages';
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
			icon: 'ph-user-focus',
			color: 'badge-primary'
		},
		SINGLE_PARTICIPANT: { label: m.singleParticipant, icon: 'ph-user', color: 'badge-accent' },
		SUPERVISOR: { label: m.supervisor, icon: 'ph-chalkboard-teacher', color: 'badge-success' },
		TEAM_MEMBER: { label: m.teamMember, icon: 'ph-users', color: 'badge-info' },
		WAITING_LIST: { label: m.waitingList, icon: 'ph-clock-user', color: 'badge-warning' }
	};

	const config = $derived(roleBadges[role]);
</script>

<span class="badge {config.color} badge-soft badge-sm gap-1">
	<i class="ph-duotone {config.icon}"></i>
	{config.label()}
</span>
