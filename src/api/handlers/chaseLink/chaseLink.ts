import { object, query, schemaBuilder } from '#api/rumble';
import {
	assertCanRequestLinkSync,
	assertCanRequestRemoteLinkSync,
	registerInstanceLinkAbilities
} from './chaseLinkPermissions';
import { requestLinkSync, requestRemoteLinkSync } from './linkSync';

registerInstanceLinkAbilities();

// The link's state, read-only: the link itself is configuration (`linkAuth.ts`).
object({ table: 'instanceLink' });
query({ table: 'instanceLink' });

// "Sync now" (`linkSync.ts`). CHASE offers the same `requestLinkSync`, which the second asks.
schemaBuilder.mutationField('requestLinkSync', (t) =>
	t.field({
		description:
			'Makes the link worker read everything of the linked CHASE again now, as on a reconnect (system admins and the linked CHASE). False while no CHASE is linked.',
		type: 'Boolean',
		resolve: (_root, _args, ctx) => {
			assertCanRequestLinkSync(ctx);
			return requestLinkSync();
		}
	})
);

schemaBuilder.mutationField('requestRemoteLinkSync', (t) =>
	t.field({
		description:
			"Asks the linked CHASE to read everything of this instance again now, through CHASE's own requestLinkSync (system admins). False while no CHASE is linked; CONFLICT when CHASE cannot be reached.",
		type: 'Boolean',
		resolve: async (_root, _args, ctx) => {
			assertCanRequestRemoteLinkSync(ctx);
			return requestRemoteLinkSync();
		}
	})
);
