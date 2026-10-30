import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { confirmDialog } from '#lib/state/dialogs.svelte.js';
import { genericPromiseToastMessages } from '#lib/utils/toast';
import formatNames from '#lib/helpers/formatNames';
import { toast } from 'svelte-sonner';

interface Person {
	givenName: string;
	familyName: string;
}

const nameOf = (person: Person) =>
	formatNames(person.givenName, person.familyName, {
		givenNameUppercase: false,
		familyNameUppercase: false
	});

/**
 * Ends a supervision after asking: the supervisor (by their registration's id) no longer looks
 * after the student (by their user id). Both sides of the user card offer it.
 */
export async function removeSupervision(
	supervisor: { id: string; user: Person },
	student: { id: string } & Person
) {
	const text = m.confirmRemoveSupervision({
		supervisor: nameOf(supervisor.user),
		student: nameOf(student)
	});
	if (!(await confirmDialog({ text, danger: true }))) return;
	const promise = Promise.resolve(
		client.mutate.disconnectFromConferenceSupervisor({
			__args: { supervisorId: supervisor.id, userId: student.id }
		})
	);
	toast.promise(promise, genericPromiseToastMessages);
	await promise;
}
