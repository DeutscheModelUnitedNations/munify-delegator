import { abilityBuilder } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';

export function registerInstanceLinkAbilities() {
	// Everyone reads where the link points (the dashboard links into CHASE) and how it fares (the
	// team's CHASE card, the link page). There is nothing secret on the row.
	abilityBuilder.instanceLink.allow('read');
	abilityBuilder.instanceLink.allow(['update', 'delete']).when(systemAdmin);
}
