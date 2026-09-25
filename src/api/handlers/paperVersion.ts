import { abilityBuilder, object, query } from '$api/rumble';
import { type TeamRole, systemAdmin, userId } from '$api/services/authHelper';

const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

// Ported from abilities/entities/paper/paperVersion.ts
abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { paper: { author: { id } } } } : undefined;
});

abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					paper: {
						conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
					}
				}
			}
		: undefined;
});

export const PaperVersionRef = object({ table: 'paperVersion' });
query({ table: 'paperVersion' });
