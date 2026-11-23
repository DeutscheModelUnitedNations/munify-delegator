import { abilityBuilder, type ApiContext } from '#api/rumble';
import { handledScans, systemAdmin } from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed } from '#api/services/authHelper/utils';
import { assertCanRecordPaper } from '#api/handlers/agreementDetail/agreementDetailPermissions';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';

/**
 * Participant care reads and deletes the scans of the people of its conference, and nobody else sees
 * them: not the rest of the team, nor whoever once uploaded them.
 */
export function registerPostalScanAbilities() {
	abilityBuilder.postalScan.allow(['read', 'delete']).when(systemAdmin);
	abilityBuilder.postalScan.allow(['read', 'delete']).when(liveWhere(handledScans));
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference (FORBIDDEN) and uploaded the file, if any, for a scan there (INVALID_INPUT). Answers the
 * user's participant row (NOT_FOUND for somebody without one) and the caller's id.
 */
export async function assertCanImportPostalScan({
	ctx,
	conferenceId,
	userId,
	fileId
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
	fileId: string | null | undefined;
}) {
	const { participantId } = await assertCanRecordPaper({ ctx, conferenceId, userId });
	if (fileId) {
		const target = { kind: 'postalScan', field: 'scan', conferenceId } as const;
		await assertCanClaimFile({ ctx, fileId, target });
	}
	return { participantId, uploaderId: ctx.mustBeLoggedIn().sub };
}

/** Refuses (NOT_FOUND) unless the caller's delete ability reaches the scan. */
export async function assertCanDeletePostalScan({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'postalScan', action: 'delete', id });
}
