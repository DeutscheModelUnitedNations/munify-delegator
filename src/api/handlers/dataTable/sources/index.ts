import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import type { DataTableSource } from '../source';
import { participantsSource } from './participants';
import { schoolsSource } from './schools';
import { teamMembersSource } from './teamMembers';
import { waitingListSource } from './waitingList';

/** Every table the backend answers, by key. */
export const DATA_TABLE_SOURCES: Record<DataTableKey, DataTableSource> = {
	participants: participantsSource,
	waitingList: waitingListSource,
	teamMembers: teamMembersSource,
	schools: schoolsSource
};
