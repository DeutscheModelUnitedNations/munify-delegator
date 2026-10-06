/** What the certificate download is made of, as fetched for the participant. */
export interface CertificateData {
	certificateContentUrl: string | null;
	title: string;
	jwt: string | null;
	fullName: string | null;
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
			holder: { fullName: string; jwt: string };
			content: string;
			filename: string;
	  };

export function planCertificateDownload(
	certificate: CertificateData | undefined,
	userId: string
): CertificateDownload {
	if (!certificate?.certificateContentUrl || !userId) return { kind: 'unavailable' };
	const { fullName, jwt, title } = certificate;
	if (!fullName || !jwt) return { kind: 'incomplete' };
	return {
		kind: 'ready',
		holder: { fullName, jwt },
		content: certificate.certificateContentUrl,
		filename: `${fullName.replace(' ', '-')}_${title.replace(' ', '-')}_certificate.pdf`
	};
}
