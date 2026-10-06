import { describe, expect, test } from 'vitest';
import { planCertificateDownload, type CertificateData } from './certificateDownload';

const certificate: CertificateData = {
	certificateContentUrl: '<p>Certificate</p>',
	title: 'MUN SH 2026',
	jwt: 'signed',
	fullName: 'Ada Lovelace'
};

describe('planCertificateDownload', () => {
	test('has nothing to download before the certificate is loaded or configured', () => {
		expect(planCertificateDownload(undefined, 'u')).toEqual({ kind: 'unavailable' });
		expect(planCertificateDownload({ ...certificate, certificateContentUrl: null }, 'u')).toEqual({
			kind: 'unavailable'
		});
		expect(planCertificateDownload(certificate, '')).toEqual({ kind: 'unavailable' });
	});

	test('is incomplete without the signed name', () => {
		expect(planCertificateDownload({ ...certificate, fullName: null }, 'u')).toEqual({
			kind: 'incomplete'
		});
		expect(planCertificateDownload({ ...certificate, jwt: null }, 'u')).toEqual({
			kind: 'incomplete'
		});
	});

	test('names the file after the participant and the conference', () => {
		expect(planCertificateDownload(certificate, 'u')).toEqual({
			kind: 'ready',
			holder: { fullName: 'Ada Lovelace', jwt: 'signed' },
			content: '<p>Certificate</p>',
			filename: 'Ada-Lovelace_MUN-SH 2026_certificate.pdf'
		});
	});
});
