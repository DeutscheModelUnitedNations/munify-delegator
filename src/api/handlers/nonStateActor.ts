import { abilityBuilder, object, query } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';

// Non-state actors come with the conference's seeding document and are read-only in the app.
abilityBuilder.nonStateActor.allow('read');
abilityBuilder.nonStateActor.allow(['update', 'delete']).when(systemAdmin);

object({ table: 'nonStateActor' });
query({ table: 'nonStateActor' });
