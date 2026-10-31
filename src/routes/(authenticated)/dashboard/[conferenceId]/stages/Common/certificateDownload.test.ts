import { describe, expect, test } from 'vitest';
import { planCertificateDownload, type CertificateData } from './certificateDownload';

const certificate: CertificateData = {
	templateUrl: 'https://s3.test/certificate.pdf',
	title: 'MUN SH 2026',
	jwt: 'signed',
	fullName: 'Ada Lovelace',
	sessions: [{ name: 'Eröffnung', attended: true }]
};

describe('planCertificateDownload', () => {
	test('has nothing to download before the certificate is loaded or configured', () => {
		expect(planCertificateDownload({ certificate: undefined, userId: 'u' })).toEqual({
			kind: 'unavailable'
		});
		expect(
			planCertificateDownload({ certificate: { ...certificate, templateUrl: null }, userId: 'u' })
		).toEqual({
			kind: 'unavailable'
		});
		expect(planCertificateDownload({ certificate, userId: '' })).toEqual({ kind: 'unavailable' });
	});

	test('is incomplete without the signed name', () => {
		expect(
			planCertificateDownload({ certificate: { ...certificate, fullName: null }, userId: 'u' })
		).toEqual({
			kind: 'incomplete'
		});
		expect(
			planCertificateDownload({ certificate: { ...certificate, jwt: null }, userId: 'u' })
		).toEqual({
			kind: 'incomplete'
		});
	});

	test('names the file after the participant and the conference', () => {
		expect(planCertificateDownload({ certificate, userId: 'u' })).toEqual({
			kind: 'ready',
			holder: {
				fullName: 'Ada Lovelace',
				jwt: 'signed',
				sessions: [{ name: 'Eröffnung', attended: true }]
			},
			content: 'https://s3.test/certificate.pdf',
			filename: 'Ada-Lovelace_MUN-SH 2026_certificate.pdf'
		});
	});
});
