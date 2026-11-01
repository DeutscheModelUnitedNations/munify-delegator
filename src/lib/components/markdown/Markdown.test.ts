// @vitest-environment node
// Rendered on the server, as SSR renders the announcement: jsdom would compile for the browser.
import { describe, expect, test } from 'vitest';
import { render } from 'svelte/server';
import Markdown from './Markdown.svelte';

/** The rendered body without Svelte's hydration markers. */
const html = (source: string) =>
	render(Markdown, { props: { source } }).body.replace(/<!--.*?-->/g, '');

describe('Markdown', () => {
	test('renders the markdown the team writes', () => {
		const body = html('# Programm\n\n**Freitag** ab [10 Uhr](https://dmun.de/programm)');
		expect(body).toContain('<strong>Freitag</strong>');
		expect(body).toContain('href="https://dmun.de/programm"');
	});

	test('shows raw HTML as text instead of running it', () => {
		const body = html('Hallo <img src=x onerror="alert(1)"> Welt\n\n<script>alert(2)</script>');
		expect(body).not.toMatch(/<img[^>]*onerror/);
		expect(body).not.toContain('<script>');
		expect(body).toContain('&lt;script>');
	});

	test('drops links and images with a scheme that runs script', () => {
		const body = html('[Programm](javascript:alert(1)) ![Logo](javascript:alert(2))');
		expect(body).not.toContain('javascript:');
		expect(body).toContain('Programm');
		expect(body).toContain('Logo');
	});
});
