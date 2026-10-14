import { abilityBuilder } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';

export function registerCustomConferenceRoleAbilities() {
	// Custom roles come with the conference's seeding document and are read-only in the app.
	abilityBuilder.customConferenceRole.allow('read');
	abilityBuilder.customConferenceRole.allow(['update', 'delete']).when(systemAdmin);
}
