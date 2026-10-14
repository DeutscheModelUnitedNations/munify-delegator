import { object, query } from '$api/rumble';
import { registerCustomConferenceRoleAbilities } from './customConferenceRolePermissions';

registerCustomConferenceRoleAbilities();

object({ table: 'customConferenceRole' });
query({ table: 'customConferenceRole' });
