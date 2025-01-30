import { db } from '../../db';
import { conference } from './data/conference';

await db.conference.upsert({
	where: {
		id: conference.id
	},
	update: conference,
	create: conference
});
