<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { ParticipationRole } from './types';

	interface Props {
		role: ParticipationRole;
	}

	let { role }: Props = $props();

	const config = $derived.by(() => {
		switch (role) {
			case 'DELEGATION_MEMBER':
				return { label: m.delegationMember(), icon: 'fa-users-viewfinder', color: 'badge-primary' };
			case 'SINGLE_PARTICIPANT':
				return { label: m.singleParticipant(), icon: 'fa-user', color: 'badge-secondary' };
			case 'SUPERVISOR':
				return { label: m.supervisor(), icon: 'fa-chalkboard-user', color: 'badge-accent' };
			case 'TEAM_MEMBER':
				return { label: m.teamMember(), icon: 'fa-user-group', color: 'badge-info' };
		}
	});
</script>

<span class="badge {config.color} badge-sm gap-1">
	<i class="fa-duotone {config.icon}"></i>
	{config.label}
</span>
