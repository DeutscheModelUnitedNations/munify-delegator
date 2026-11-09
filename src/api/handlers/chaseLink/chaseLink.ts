import { object, query } from '#api/rumble';
import { registerInstanceLinkAbilities } from './chaseLinkPermissions';

registerInstanceLinkAbilities();

// The link's state, read-only: the link itself is configuration (`linkAuth.ts`).
object({ table: 'instanceLink' });
query({ table: 'instanceLink' });
