import { abilityBuilder, object, query } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';
import { visibleAssignedDelegations } from '$api/services/assignmentVisibility';

// Everyone can see the nations in the system; they are reference data, never edited in the app.
abilityBuilder.nation.allow('read');
abilityBuilder.nation.allow(['update', 'delete']).when(systemAdmin);

export const NationRef = object({
	table: 'nation',
	adjust: (t) => ({
		assignedDelegations: t.relation('assignedDelegations', { query: visibleAssignedDelegations })
	})
});
query({ table: 'nation' });
