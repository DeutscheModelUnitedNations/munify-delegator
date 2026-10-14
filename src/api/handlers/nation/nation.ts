import { object, query } from '$api/rumble';
import { registerNationAbilities } from './nationPermissions';

registerNationAbilities();

export const NationRef = object({ table: 'nation' });
query({ table: 'nation' });
