/**
 * The statistics dashboard's materialized views (the `statistics_materialized_views` migration),
 * in the order a refresh has to run them: `statistics_refreshed_at` records when the others were
 * recomputed, so it goes last. Kept apart from `db.ts` so the dev seed, which runs outside
 * SvelteKit, can refresh them too.
 */
export const STATISTICS_VIEWS = [
	'statistics_people',
	'statistics_delegations',
	'statistics_registration_days',
	'statistics_role_applications',
	'statistics_ages',
	'statistics_addresses',
	'statistics_participant_status',
	'statistics_committee_fill',
	'statistics_waiting_list',
	'statistics_papers',
	'statistics_refreshed_at'
];
