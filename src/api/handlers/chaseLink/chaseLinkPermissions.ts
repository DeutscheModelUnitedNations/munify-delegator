import { abilityBuilder } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';

export function registerInstanceLinkAbilities() {
	// Everyone reads where the link points (the dashboard links into CHASE) and when it last synced
	// (the team's CHASE card); how it fails (`lastError`) is for system admins, on the link page.
	abilityBuilder.instanceLink
		.allow('read')
		.when(() => ({ columns: { id: true, remoteUrl: true, lastReconcileAt: true } }));
	abilityBuilder.instanceLink.allow(['read', 'update', 'delete']).when(systemAdmin);
}
