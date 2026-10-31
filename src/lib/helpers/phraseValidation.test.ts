import { describe, it, expect } from 'vitest';
import { parsePhrasePatterns, validatePhrase } from '#lib/helpers/phraseValidation';

describe('phraseValidation', () => {
	describe('parsePhrasePatterns', () => {
		it('should skip empty lines and comments', () => {
			const content = `
# This is a comment
alarmiert

# Another comment
betonend
`;
			const patterns = parsePhrasePatterns(content);
			expect(patterns).toHaveLength(2);
			expect(patterns[0].phrase).toBe('alarmiert');
			expect(patterns[1].phrase).toBe('betonend');
		});

		it('should trim whitespace from phrases', () => {
			const content = '  alarmiert  \n  betonend  ';
			const patterns = parsePhrasePatterns(content);
			expect(patterns[0].phrase).toBe('alarmiert');
			expect(patterns[1].phrase).toBe('betonend');
		});

		it('should create case-insensitive regex for each phrase', () => {
			const patterns = parsePhrasePatterns('Alarmiert');
			expect(patterns[0].regex.test('alarmiert')).toBe(true);
			expect(patterns[0].regex.test('ALARMIERT')).toBe(true);
		});
	});

	describe('simple phrases', () => {
		it('should match exact phrase at start', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: 'alarmiert über die Situation', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});

		it('should match case-insensitively', () => {
			const patterns = parsePhrasePatterns('Alarmiert');
			const result = validatePhrase({ text: 'alarmiert über die Situation', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});

		it('should not match if phrase is not at start', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: 'sehr alarmiert über die Situation', patterns });

			expect(result.valid).toBe(false);
		});

		it('should match partial words at start', () => {
			const patterns = parsePhrasePatterns('alarm');
			const result = validatePhrase({ text: 'alarmiert über die Situation', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarm');
		});
	});

	describe('multi-word phrases', () => {
		it('should match multi-word phrase at start', () => {
			const patterns = parsePhrasePatterns('zutiefst bedauernd');
			const result = validatePhrase({ text: 'zutiefst bedauernd über den Verlust', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('zutiefst bedauernd');
		});

		it('should not match if only first word matches', () => {
			const patterns = parsePhrasePatterns('zutiefst bedauernd');
			const result = validatePhrase({ text: 'zutiefst besorgt über', patterns });

			expect(result.valid).toBe(false);
		});

		it('should match phrases with German special characters', () => {
			const patterns = parsePhrasePatterns('höchst besorgt');
			const result = validatePhrase({ text: 'höchst besorgt über die Lage', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('höchst besorgt');
		});
	});

	describe('multiple patterns', () => {
		it('should match first matching pattern', () => {
			const patterns = parsePhrasePatterns(`
alarmiert
zutiefst bedauernd
betonend
`);
			const result = validatePhrase({ text: 'zutiefst bedauernd über', patterns });
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('zutiefst bedauernd');
		});

		it('should try all patterns until one matches', () => {
			const patterns = parsePhrasePatterns(`
alarmiert
betonend
fest überzeugt
`);
			const result = validatePhrase({ text: 'fest überzeugt dass', patterns });
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('fest überzeugt');
		});

		it('should prefer longer matches when multiple patterns could match', () => {
			// Note: current implementation returns first match, not longest
			// Patterns should be ordered with longer phrases first for best results
			const patterns = parsePhrasePatterns(`
zutiefst bedauernd
bedauernd
`);
			const result = validatePhrase({ text: 'zutiefst bedauernd über', patterns });
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('zutiefst bedauernd');
		});
	});

	describe('edge cases', () => {
		it('should return invalid for empty text', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: '', patterns });

			expect(result.valid).toBe(false);
		});

		it('should return invalid for whitespace-only text', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: '   ', patterns });

			expect(result.valid).toBe(false);
		});

		it('should return invalid when no patterns match', () => {
			const patterns = parsePhrasePatterns('alarmiert\nbetonend');
			const result = validatePhrase({ text: 'ungültiger Anfang', patterns });

			expect(result.valid).toBe(false);
		});

		it('should return invalid for empty patterns array', () => {
			const result = validatePhrase({ text: 'some text', patterns: [] });

			expect(result.valid).toBe(false);
		});

		it('should handle text that is just the phrase', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: 'alarmiert', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});

		it('should trim input text before matching', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase({ text: '  alarmiert über die Lage  ', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});

		it('should handle phrases with special regex characters', () => {
			const patterns = parsePhrasePatterns('test (with) brackets');
			const result = validatePhrase({ text: 'test (with) brackets and more', patterns });

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('test (with) brackets');
		});
	});

	describe('real-world preamble patterns', () => {
		const preambleContent = `
alarmiert
anerkennend
zutiefst bedauernd
bedauernd
begrüßend
erneut bekräftigend
bekräftigend
höchst besorgt
besorgt
tief bestürzt
bestürzt
betonend
fest überzeugt
überzeugt
in Anbetracht der Tatsache
in Anbetracht
unter Hinweis auf
`;

		it('should validate various preamble clauses', () => {
			const patterns = parsePhrasePatterns(preambleContent);

			expect(validatePhrase({ text: 'alarmiert über die Entwicklungen', patterns }).valid).toBe(
				true
			);
			expect(validatePhrase({ text: 'zutiefst bedauernd über den Konflikt', patterns }).valid).toBe(
				true
			);
			expect(validatePhrase({ text: 'bedauernd über die Situation', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'höchst besorgt über die Lage', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'besorgt über das Ausmaß', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'fest überzeugt von der Notwendigkeit', patterns }).valid).toBe(
				true
			);
			expect(validatePhrase({ text: 'überzeugt dass Frieden möglich ist', patterns }).valid).toBe(
				true
			);
			expect(
				validatePhrase({ text: 'in Anbetracht der Tatsache dass die Resolution gilt', patterns })
					.valid
			).toBe(true);
			expect(
				validatePhrase({ text: 'in Anbetracht der schwierigen Umstände', patterns }).valid
			).toBe(true);
		});

		it('should reject invalid preamble clauses', () => {
			const patterns = parsePhrasePatterns(preambleContent);

			expect(validatePhrase({ text: 'Die Versammlung stellt fest', patterns }).valid).toBe(false);
			expect(validatePhrase({ text: 'Wir fordern auf', patterns }).valid).toBe(false);
			expect(validatePhrase({ text: 'Es wird beschlossen', patterns }).valid).toBe(false);
		});
	});

	describe('real-world operative patterns', () => {
		const operativeContent = `
akzeptiert
appelliert eindringlich
appelliert
beschließt
fordert auf
fordert
bittet nachdrücklich
bittet
empfiehlt dringend
empfiehlt
verurteilt entschieden
verurteilt
`;

		it('should validate various operative clauses', () => {
			const patterns = parsePhrasePatterns(operativeContent);

			expect(validatePhrase({ text: 'akzeptiert den Vorschlag', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'appelliert an alle Staaten', patterns }).valid).toBe(true);
			expect(
				validatePhrase({ text: 'appelliert eindringlich an die Parteien', patterns }).valid
			).toBe(true);
			expect(validatePhrase({ text: 'beschließt eine neue Resolution', patterns }).valid).toBe(
				true
			);
			expect(
				validatePhrase({ text: 'fordert die Mitgliedstaaten auf zu handeln', patterns }).valid
			).toBe(true);
			expect(validatePhrase({ text: 'fordert auf sofort zu reagieren', patterns }).valid).toBe(
				true
			);
			expect(validatePhrase({ text: 'bittet um Unterstützung', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'bittet nachdrücklich um Hilfe', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'empfiehlt die Annahme', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'empfiehlt dringend Maßnahmen', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'verurteilt die Gewalt', patterns }).valid).toBe(true);
			expect(validatePhrase({ text: 'verurteilt entschieden alle Angriffe', patterns }).valid).toBe(
				true
			);
		});

		it('should reject invalid operative clauses', () => {
			const patterns = parsePhrasePatterns(operativeContent);

			expect(validatePhrase({ text: 'In Anbetracht der Lage', patterns }).valid).toBe(false);
			expect(validatePhrase({ text: 'Besorgt über die Entwicklung', patterns }).valid).toBe(false);
		});
	});
});
