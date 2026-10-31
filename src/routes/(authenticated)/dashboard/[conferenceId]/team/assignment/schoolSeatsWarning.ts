import { exceededBy, type SchoolSeatCount, type SchoolSeats } from './schoolSeats';
import { m } from '#lib/paraglide/messages';
import { toast } from 'svelte-sonner';

/** Warns (never blocks) when `added` seats take a school past the conference's limit. */
export function warnAboutSchoolSeats({
	counts,
	added,
	limit
}: {
	counts: readonly SchoolSeatCount[];
	added: readonly SchoolSeats[];
	limit: number | null;
}) {
	const exceeded = exceededBy({ counts, added, limit });
	if (!exceeded) return;
	toast.warning(
		m.assignmentSchoolSeatsWarning({
			school: exceeded.name,
			seats: exceeded.seats,
			limit: exceeded.limit
		})
	);
}
