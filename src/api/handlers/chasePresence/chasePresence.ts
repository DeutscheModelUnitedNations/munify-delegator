import { object, query } from '#api/rumble';
import { registerChasePresenceAbilities } from './chasePresencePermissions';

/**
 * What the linked CHASE recorded about a conference's presence (`docs/plans/chase-link.md`),
 * written by the link worker and read live by the attendance import page.
 */
registerChasePresenceAbilities();

object({ table: 'chasePresence' });
query({ table: 'chasePresence' });
