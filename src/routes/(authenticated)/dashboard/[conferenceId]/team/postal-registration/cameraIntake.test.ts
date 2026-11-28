import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, test, vi } from 'vitest';
import type { CameraPage } from '#lib/components/scanner/pageCamera.svelte';
import { logger } from '#lib/logger';
import { nameOfUser, takeCameraPage } from './cameraIntake';

const { keepScan, queryUser } = vi.hoisted(() => ({ keepScan: vi.fn(), queryUser: vi.fn() }));
vi.mock('#lib/api/rumbleClient/client', () => ({ client: { query: { user: queryUser } } }));
vi.mock('#lib/components/postal/uploadScan', () => ({ keepScan }));
vi.mock('#lib/components/scanner/scanAcceptance', () => ({
	userIdOfCode: (code: string) => code.split('/')[0]
}));
vi.mock('#lib/paperScan/readScan', () => ({ fieldsOfCode: () => ['termsSignature'] }));

const pageOf = (readings: CameraPage['readings']): CameraPage => ({
	code: 'ada/1',
	readings,
	file: { name: 'camera.jpg', type: 'image/jpeg', bytes: new Uint8Array([1, 2, 3]) }
});
const signed = [{ field: 'termsSignature' as const, state: 'yes' as const }];
const take = (readings: CameraPage['readings']) =>
	takeCameraPage({ page: pageOf(readings), conferenceId: 'conference' });

describe('takeCameraPage', () => {
	test("keeps the page as the person's scan from the camera, with nothing to look at", async () => {
		keepScan.mockResolvedValue('stored');
		expect(await take(signed)).toEqual({ userId: 'ada', outcome: 'stored', newProblem: false });
		expect(keepScan).toHaveBeenCalledWith({
			source: 'CAMERA',
			conferenceId: 'conference',
			args: {
				userId: 'ada',
				page: { page: 1, code: 'ada/1', fields: ['termsSignature'], readings: signed },
				contentKey: expect.stringMatching(/^[0-9a-f]{64}:1$/),
				file: pageOf(signed).file
			}
		});
	});

	test('takes a page scanned before as nothing to look at', async () => {
		keepScan.mockResolvedValue('known');
		expect(await take(signed)).toMatchObject({ outcome: 'known', newProblem: false });
	});

	test('lists unclear fields, which the camera told of itself', async () => {
		keepScan.mockResolvedValue('stored');
		const taken = await take([{ field: 'termsSignature', state: 'unclear' }]);
		expect(taken).toMatchObject({ outcome: 'stored', newProblem: false });
		expect(taken.problem).toBeTruthy();
		expect((await take(null)).problem).toBeTruthy();
	});

	test('has the camera tell of an earlier scan that says more', async () => {
		keepScan.mockResolvedValue('differs');
		const taken = await take(signed);
		expect(taken).toMatchObject({ outcome: 'differs', newProblem: true });
		expect(taken.problem).toBeTruthy();
	});

	test("has the camera tell why the page was not kept, in the API's words", async () => {
		const refused = new GraphQLError('Nicht für diese Konferenz angemeldet', {
			extensions: { code: 'NOT_FOUND' }
		});
		const failure = new CombinedError({ graphQLErrors: [refused] });
		keepScan.mockImplementation(async () => {
			throw failure;
		});
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		expect(await take(signed)).toEqual({
			userId: 'ada',
			outcome: 'failed',
			problem: 'Nicht für diese Konferenz angemeldet',
			newProblem: true
		});
		expect(warn).toHaveBeenCalledWith('Keeping a photographed page failed', failure);
	});
});

describe('nameOfUser', () => {
	test('lists a person by their name, else by their id', async () => {
		queryUser.mockResolvedValueOnce({ givenName: 'Ada', familyName: 'Lovelace' });
		expect(await nameOfUser('ada')).toBe('Ada Lovelace');
		queryUser.mockResolvedValueOnce(null);
		expect(await nameOfUser('ada')).toBe('ada');
		queryUser.mockImplementationOnce(async () => {
			throw new Error('offline');
		});
		expect(await nameOfUser('ada')).toBe('ada');
	});
});
