/** What the certificate download is made of, as fetched for the participant. */
export interface CertificateData {
	/** The certificate's PDF template, null while none is uploaded. */
	templateUrl: string | null;
	title: string;
	code: string | null;
	fullName: string | null;
	/** The check-in sessions the certificate lists. */
	sessions: readonly string[];
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
			holder: { fullName: string; code: string; sessions: readonly string[] };
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
	const { fullName, code, title, sessions } = certificate;
	if (!fullName || !code) return { kind: 'incomplete' };
	return {
		kind: 'ready',
		holder: { fullName, code, sessions },
		content: certificate.templateUrl,
		filename: `${fullName.replace(' ', '-')}_${title.replace(' ', '-')}_certificate.pdf`
	};
}
