import { abilityBuilder } from '#api/rumble';
import { systemAdmin, teamConference } from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

export function registerChasePresenceAbilities() {
	abilityBuilder.chasePresence.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care decides who attended, from what CHASE recorded (the attendance import page).
	abilityBuilder.chasePresence
		.allow('read')
		.when((ctx) =>
			grantWhere({ conference: teamConference({ ctx, permission: 'manageParticipants' }) })
		);
}
