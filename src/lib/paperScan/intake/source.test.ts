import { describe, expect, test, vi } from 'vitest';
import { blobSource, bufferedSource, bytesSource } from './source';

const MB = 1024 * 1024;
const bytes = Uint8Array.from({ length: 2 * MB + 77 }, (_, index) => (index * 31) % 251);

describe('bufferedSource', () => {
	const counted = () => {
		const read = vi.fn(bytesSource(bytes).read);
		return { read, source: bufferedSource({ size: bytes.length, read }) };
	};

	test.each([
		[0, 10],
		[131_000, 131_100],
		[262_143, 262_145],
		[bytes.length - 5, bytes.length],
		[100, 300_000],
		[5, 2 * MB],
		[7, 7]
	])('reads the same as the source (%i to %i)', async (from, to) => {
		expect(await counted().source.read({ from, to })).toEqual(bytes.slice(from, to));
	});

	test('reads what lies together once, and keeps only the latest', async () => {
		const { read, source } = counted();
		for (let at = 0; at < 1000; at += 10) await source.read({ from: at, to: at + 10 });
		expect(read).toHaveBeenCalledOnce();
	});

	test('reads again what failed', async () => {
		const { read, source } = counted();
		read.mockRejectedValueOnce(new Error('the bucket is down'));
		await expect(source.read({ from: 0, to: 10 })).rejects.toThrow('the bucket is down');
		expect(await source.read({ from: 0, to: 10 })).toEqual(bytes.slice(0, 10));
	});
});

test('blobSource reads a part of a file', async () => {
	const source = blobSource(new Blob([bytes.slice(0, 100)]));
	expect(source.size).toBe(100);
	expect(await source.read({ from: 10, to: 20 })).toEqual(bytes.slice(10, 20));
});
