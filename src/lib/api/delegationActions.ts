import { client } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';
import { genericPromiseToastMessages } from '$lib/utils/toast';
import { toast } from 'svelte-sonner';

/** Withdraws a delegation's application after the user confirms it. */
export async function revokeDelegationApplication(delegationId: string) {
	if (!confirm(m.confirmRevokeApplication())) return;
	const promise = client.mutate.updateDelegation({
		__args: { id: delegationId, applied: false },
		id: true,
		applied: true
	});
	toast.promise(promise, genericPromiseToastMessages);
	await promise;
}

/** Asks for a new school name and saves it on the delegation; cancelling the prompt does nothing. */
export async function changeDelegationSchool(delegationId: string) {
	const newSchool = prompt(m.enterNewSchoolName());
	if (!newSchool) return;
	try {
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, school: newSchool },
			id: true,
			school: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	} catch (error) {
		console.error('Failed to change school name:', error);
	}
}

/** Issues the delegation a new entry code after the user confirms it. */
export async function rotateDelegationEntryCode(delegationId: string) {
	if (!confirm(m.confirmRotateCode())) return;
	const promise = client.mutate.updateDelegation({
		__args: { id: delegationId, resetEntryCode: true },
		id: true,
		entryCode: true
	});
	toast.promise(promise, genericPromiseToastMessages);
	await promise;
}
