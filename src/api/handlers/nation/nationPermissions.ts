import { abilityBuilder } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';

export function registerNationAbilities() {
	// Everyone can see the nations in the system; they are reference data, never edited in the app.
	abilityBuilder.nation.allow('read');
	abilityBuilder.nation.allow(['update', 'delete']).when(systemAdmin);
}
