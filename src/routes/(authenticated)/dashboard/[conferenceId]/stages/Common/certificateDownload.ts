import type { CertificateSessionMark } from '#lib/utils/certificateSessionLayout';

/** What the certificate download is made of, as fetched for the participant. */
export interface CertificateData {
	/** The certificate's PDF template, null while none is uploaded. */
	templateUrl: string | null;
	title: string;
	jwt: string | null;
	fullName: string | null;
	/** The check-in sessions the certificate lists. */
	sessions: readonly CertificateSessionMark[];
}

/**
 * Whether a certificate can be downloaded: `unavailable` while there is nothing to print (no
 * certificate configured or not loaded yet), `incomplete` when the participant's signed details
 * are missing, otherwise everything the PDF needs.
 */
export type CertificateDownload =
	| { kind: 'unavailable' }
	| { kind: 'incomplete' }
	| {
			kind: 'ready';
			holder: { fullName: string; jwt: string; sessions: readonly CertificateSessionMark[] };
			content: string;
			filename: string;
	  };

export function planCertificateDownload({
	certificate,
	userId
}: {
	certificate: CertificateData | undefined;
	userId: string;
}): CertificateDownload {
	if (!certificate?.templateUrl || !userId) return { kind: 'unavailable' };
	const { fullName, jwt, title, sessions } = certificate;
	if (!fullName || !jwt) return { kind: 'incomplete' };
	return {
		kind: 'ready',
		holder: { fullName, jwt, sessions },
		content: certificate.templateUrl,
		filename: `${fullName.replace(' ', '-')}_${title.replace(' ', '-')}_certificate.pdf`
	};
}
