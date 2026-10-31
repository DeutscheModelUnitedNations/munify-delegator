import { abilityBuilder } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';

export function registerNationAbilities() {
	// Everybody, signed in or not, reads the nations: global reference data, edited only by system
	// admins.
	abilityBuilder.nation.allow('read');
	abilityBuilder.nation.allow(['update', 'delete']).when(systemAdmin);
}
