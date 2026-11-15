// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { announcementBlocks } from './announcementBlocks';

describe('announcementBlocks', () => {
	test('turns headings, paragraphs and lists into blocks', () => {
		expect(
			announcementBlocks(
				'# Room change\n\nThe **GA** meets in _room 2_.\n\n- bring your badge\n- be on time'
			)
		).toEqual([
			{ type: 'heading', text: 'Room change' },
			{ type: 'paragraph', text: 'The GA meets in room 2.' },
			{ type: 'list', ordered: false, items: ['bring your badge', 'be on time'] }
		]);
	});

	test('keeps http links as links and drops other schemes and raw HTML', () => {
		expect(
			announcementBlocks(
				'See [the plan](https://example.org/plan) or [this](javascript:alert(1)).\n\n<script>alert(1)</script>'
			)
		).toEqual([{ type: 'paragraph', text: 'See [the plan](https://example.org/plan) or this.' }]);
	});

	test('numbers stay a list, and an empty text gives nothing', () => {
		expect(announcementBlocks('1. first\n2. second')).toEqual([
			{ type: 'list', ordered: true, items: ['first', 'second'] }
		]);
		expect(announcementBlocks('  \n')).toEqual([]);
	});
});
