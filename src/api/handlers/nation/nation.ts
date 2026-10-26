import { object, query } from '#api/rumble.js';
import { registerNationAbilities } from './nationPermissions';

registerNationAbilities();

export const NationRef = object({ table: 'nation' });
query({ table: 'nation' });
