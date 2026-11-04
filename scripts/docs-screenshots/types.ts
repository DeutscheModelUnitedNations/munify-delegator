import type { Shot as KitShot } from '@deutschemodelunitednations/docs-kit/capture';
import type de from '../../messages/de.json';
import type { seedConferenceId } from '../../src/api/db/seed-dev/plans';

export type MessageKey = Exclude<keyof typeof de, '$schema'>;

/**
 * The dev seed's personas the shots sign in as, by their `sub` (`seed-data/devAccounts.ts`). Team
 * personas hold their role on every seed conference's team.
 */
export type Persona =
	| 'dev-participant'
	| 'dev-head-delegate'
	| 'dev-delegate'
	| 'dev-team-pm'
	| 'dev-team-care'
	| 'dev-team-content-lead';

/** The seed conferences by stage. Their ids are fixed (`seedConferenceId`). */
export type StageIds = { conferenceId: typeof seedConferenceId };

export type Shot = KitShot<StageIds, Persona, MessageKey>;
