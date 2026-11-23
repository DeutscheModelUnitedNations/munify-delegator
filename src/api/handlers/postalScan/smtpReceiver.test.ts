// @vitest-environment node
import type { AddressInfo } from 'node:net';
import nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ScanFile } from '#lib/paperScan/intake/takeScan';
import { createSmtpReceiver, scansOfEmail, tlsOptions } from './smtpReceiver';
import { IntakeBusyError } from './intakeGate';
import { NotAllowedToDeliverError } from './scanIngest';

const { findDeliverer, ingestScans } = vi.hoisted(() => ({
	findDeliverer: vi.fn(),
	ingestScans: vi.fn()
}));
vi.mock('$app/env/private', () => ({
	SCANNER_SMTP_HOST: 'scan.example.org',
	SCANNER_SMTP_PORT: undefined,
	SCANNER_SMTP_TLS: 'proxy',
	SCANNER_SMTP_TLS_CERT: undefined,
	SCANNER_SMTP_TLS_KEY: undefined,
	LOG_LEVEL: 'silent',
	NODE_ENV: 'test'
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessService', () => ({ findDeliverer }));
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => ({
	mayDeliver: async ({ role }: { role: string }) => role === 'PARTICIPANT_CARE'
}));
vi.mock('./scanIngest', () => ({
	ingestScans,
	NotAllowedToDeliverError: class NotAllowedToDeliverError extends Error {}
}));
vi.mock('#api/services/shutdown', () => ({ closeOnShutdown: vi.fn() }));

const received: ScanFile[] = [];
const deliverer = { accessId: 'a', role: 'PARTICIPANT_CARE' };
const PDF = Buffer.from('%PDF-1.7 a stack');

let server: ReturnType<typeof createSmtpReceiver>;
let port: number;

beforeEach(async () => {
	vi.resetAllMocks();
	findDeliverer.mockResolvedValue(deliverer);
	ingestScans.mockImplementation(async ({ receive }) => received.push(...(await receive())));
	received.length = 0;
	server = createSmtpReceiver(tlsOptions());
	await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
	const address: AddressInfo | string | null = server.server.address();
	port = address !== null && typeof address === 'object' ? address.port : 0;
});

afterEach(() => new Promise<void>((closed) => server.close(closed)));

/** Sends an email as a scanner would. */
function sendMail({
	auth = { user: 'scan-1', pass: 'secret' },
	attachments = [{ filename: 'stack.pdf', content: PDF, contentType: 'application/octet-stream' }]
}: {
	auth?: { user: string; pass: string } | undefined;
	attachments?: { filename?: string; content: Buffer | string; contentType: string }[];
} = {}) {
	return nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, auth }).sendMail({
		from: 'copier@example.org',
		to: 'scan@anywhere.example',
		text: 'Scan',
		attachments
	});
}

describe('the SMTP receiver', () => {
	test("takes in a scanner's attachments, to whatever address it sends", async () => {
		await sendMail();
		expect(findDeliverer).toHaveBeenCalledWith({ username: 'scan-1', password: 'secret' });
		expect(ingestScans).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ deliverer, source: 'EMAIL' })
		);
		expect(received).toEqual([{ name: 'stack.pdf', bytes: Uint8Array.from(PDF) }]);
	});

	test('takes nothing without a login, a wrong one, or from somebody no longer allowed', async () => {
		await expect(
			nodemailer
				.createTransport({ host: '127.0.0.1', port, secure: false })
				.sendMail({ from: 'a@example.org', to: 'b@example.org', text: 'spam' })
		).rejects.toMatchObject({ responseCode: 530 });
		findDeliverer.mockResolvedValue(undefined);
		await expect(sendMail()).rejects.toMatchObject({ responseCode: 535 });
		findDeliverer.mockResolvedValue({ ...deliverer, role: 'MEMBER' });
		await expect(sendMail()).rejects.toMatchObject({ responseCode: 535 });
		expect(ingestScans).not.toHaveBeenCalled();
	});

	test('tells the scanner to try again while too many wait, and when it failed', async () => {
		ingestScans.mockRejectedValueOnce(new IntakeBusyError());
		await expect(sendMail()).rejects.toMatchObject({ responseCode: 452 });
		ingestScans.mockRejectedValueOnce(new NotAllowedToDeliverError());
		await expect(sendMail()).rejects.toMatchObject({ responseCode: 535 });
		ingestScans.mockRejectedValueOnce(new Error('S3 is down'));
		await expect(sendMail()).rejects.toMatchObject({ responseCode: 451 });
	});

	test('answers a large email it turned away, and takes the next', async () => {
		ingestScans.mockRejectedValueOnce(new IntakeBusyError());
		const content = Buffer.alloc(5_000_000, 1);
		const attachments = [{ filename: 'a.pdf', content, contentType: 'application/pdf' }];
		await expect(sendMail({ attachments })).rejects.toMatchObject({ responseCode: 452 });
		await sendMail({ attachments });
		expect(received).toHaveLength(1);
	});

	test('offers no STARTTLS, and refuses it, where TLS ends in front of the app', async () => {
		const refused = nodemailer
			.createTransport({ host: '127.0.0.1', port, secure: false, requireTLS: true })
			.sendMail({ from: 'a@example.org', to: 'b@example.org', text: 'x' });
		await expect(refused).rejects.toMatchObject({ code: 'ETLS' });
	});
});

describe('scansOfEmail', () => {
	const email = (type: string, body: string) =>
		Buffer.from(
			[
				'From: copier@example.org',
				'MIME-Version: 1.0',
				'Content-Type: multipart/mixed; boundary=x',
				'',
				'--x',
				'Content-Type: text/plain',
				'',
				'See attached',
				'--x',
				`Content-Type: ${type}`,
				'Content-Disposition: attachment; filename="a"',
				'',
				body,
				'--x--',
				''
			].join('\r\n')
		);

	test('takes scans by type or by their bytes, and leaves texts', async () => {
		expect(await scansOfEmail(email('text/csv', 'a,b'))).toEqual([]);
		expect((await scansOfEmail(email('text/plain', '%PDF-1.4'))).map(({ name }) => name)).toEqual([
			'a'
		]);
		// unreadable, but its owner has to hear of it
		expect(await scansOfEmail(email('image/tiff', 'II*'))).toHaveLength(1);
	});
});
