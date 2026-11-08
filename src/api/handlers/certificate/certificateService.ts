import { db } from '#api/db/db';
import { CERTIFICATE_SECRET } from '$app/env/private';
import { assertFindFirstExists } from '@m1212e/rumble';
import { exportJWK } from 'jose';
import { certificateAlg } from '#lib/helpers/certificateJwt';
import { issueCertificateCode } from '#api/handlers/signedCode/signedCodeService';
import { generateSeededRsa } from './deterministicRSAKeypair';
import { certificateContents, certificateSessions } from './certificatePayload';

/**
 * Participation certificates are signed so they can be verified offline, by anyone, without
 * calling back into this app. They are signed codes now (`issueCertificateCode`); before, they
 * were JWTs signed with RS256, by a key pair derived deterministically from `CERTIFICATE_SECRET`.
 * That key signs nothing any more, but its public half stays published, so the certificates
 * issued back then still verify.
 */
const keyPair = generateSeededRsa({ seed: CERTIFICATE_SECRET, opts: { bits: 2048 } });

const jwkPublicKey = keyPair
	.then((pair) => exportJWK(pair.publicKey))
	.then((key) => ({ ...key, alg: certificateAlg }));

/** The public half of the key the certificates issued as JWTs were signed with, as a JWK. */
export function certificatePublicKey() {
	return jwkPublicKey;
}

/**
 * The conference's check-in sessions as the person's certificate lists them: only those they were
 * scanned at and the team keeps on the certificates (`certificateSessions`).
 */
async function sessionsOf({
	conferenceId,
	participantId
}: {
	conferenceId: string;
	participantId: string;
}) {
	const sessions = await db.query.attendanceSession.findMany({
		where: { conferenceId },
		columns: { occasion: true, startedAt: true, showOnCertificate: true },
		// only the holder's own scan, if any
		with: {
			entries: {
				where: { conferenceParticipantId: participantId },
				columns: { id: true },
				limit: 1
			}
		}
	});
	return certificateSessions(
		sessions.map((session) => ({
			occasion: session.occasion,
			startedAt: session.startedAt,
			showOnCertificate: session.showOnCertificate,
			attended: session.entries.length > 0
		}))
	);
}

/**
 * Signs the participation certificate of the person in the conference. Refuses (NOT_FOUND) somebody
 * without a part in it; answers nulls while their attendance is not recorded.
 */
export async function issueCertificate({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	const participant = await db.query.conferenceParticipant
		.findFirst({
			where: { conferenceId, userId },
			columns: { id: true, didAttend: true },
			with: {
				conference: {
					columns: { title: true, longTitle: true, startConference: true, endConference: true }
				},
				user: { columns: { givenName: true, familyName: true } }
			}
		})
		.then(assertFindFirstExists);

	const sessions = await sessionsOf({ conferenceId, participantId: participant.id });
	const contents = certificateContents({ ...participant, sessions });
	if (!contents) return { code: null, fullName: null, sessions: [] };

	const code = await issueCertificateCode({ certificate: contents.payload });
	return { code, fullName: contents.fullName, sessions };
}
