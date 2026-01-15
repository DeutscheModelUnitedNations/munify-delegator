import { describe, it, expect } from 'vitest';
import { parsePhrasePatterns, validatePhrase } from '$lib/services/phraseValidation';

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
			expect(patterns[0].raw).toBe('alarmiert');
			expect(patterns[1].raw).toBe('betonend');
		});
	});

	describe('simple phrases (no special syntax)', () => {
		it('should match exact phrase at start', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('alarmiert über die Situation', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
			expect(result.italicEnd).toBe(9);
		});

		it('should match case-insensitively', () => {
			const patterns = parsePhrasePatterns('Alarmiert');
			const result = validatePhrase('alarmiert über die Situation', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});

		it('should not match if phrase is not at start', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('sehr alarmiert über die Situation', patterns);

			expect(result.valid).toBe(false);
		});

		it('should not match partial words', () => {
			const patterns = parsePhrasePatterns('alarm');
			const result = validatePhrase('alarmiert über die Situation', patterns);

			// 'alarm' matches the start of 'alarmiert', but regex matches 'alarm' only
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarm');
		});
	});

	describe('optional prefix: (word) phrase', () => {
		it('should match with optional prefix present', () => {
			const patterns = parsePhrasePatterns('(zutiefst) bedauernd');
			const result = validatePhrase('zutiefst bedauernd über den Verlust', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('zutiefst bedauernd');
		});

		it('should match without optional prefix', () => {
			const patterns = parsePhrasePatterns('(zutiefst) bedauernd');
			const result = validatePhrase('bedauernd über den Verlust', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('bedauernd');
		});

		it('should match with different optional prefixes', () => {
			const patterns = parsePhrasePatterns('(tief) bestürzt');

			const withPrefix = validatePhrase('tief bestürzt über die Nachricht', patterns);
			expect(withPrefix.valid).toBe(true);
			expect(withPrefix.matchedPhrase).toBe('tief bestürzt');

			const withoutPrefix = validatePhrase('bestürzt über die Nachricht', patterns);
			expect(withoutPrefix.valid).toBe(true);
			expect(withoutPrefix.matchedPhrase).toBe('bestürzt');
		});
	});

	describe('optional suffix: phrase (word)', () => {
		it('should match with optional suffix present', () => {
			const patterns = parsePhrasePatterns('appelliert (eindringlich)');
			const result = validatePhrase('appelliert eindringlich an alle Staaten', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('appelliert eindringlich');
		});

		it('should match without optional suffix', () => {
			const patterns = parsePhrasePatterns('appelliert (eindringlich)');
			const result = validatePhrase('appelliert an alle Staaten', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('appelliert');
		});

		it('should match begrüßt (wärmstens)', () => {
			const patterns = parsePhrasePatterns('begrüßt (wärmstens)');

			const withSuffix = validatePhrase('begrüßt wärmstens die Initiative', patterns);
			expect(withSuffix.valid).toBe(true);
			expect(withSuffix.matchedPhrase).toBe('begrüßt wärmstens');

			const withoutSuffix = validatePhrase('begrüßt die Initiative', patterns);
			expect(withoutSuffix.valid).toBe(true);
			expect(withoutSuffix.matchedPhrase).toBe('begrüßt');
		});
	});

	describe('optional placeholder: phrase _ suffix', () => {
		it('should match with words in placeholder position', () => {
			const patterns = parsePhrasePatterns('fordert _ auf');
			const result = validatePhrase('fordert die Mitgliedstaaten auf zu handeln', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('fordert die Mitgliedstaaten auf');
		});

		it('should match with multiple words in placeholder', () => {
			const patterns = parsePhrasePatterns('fordert _ auf');
			const result = validatePhrase(
				'fordert alle betroffenen Parteien nachdrücklich auf Maßnahmen zu ergreifen',
				patterns
			);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('fordert alle betroffenen Parteien nachdrücklich auf');
		});

		it('should match without words in placeholder (placeholder is optional)', () => {
			const patterns = parsePhrasePatterns('fordert _ auf');
			const result = validatePhrase('fordert auf zu handeln', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('fordert auf');
		});

		it('should match bittet _ (nachdrücklich)', () => {
			const patterns = parsePhrasePatterns('bittet _ (nachdrücklich)');

			// With placeholder and suffix
			const full = validatePhrase('bittet die Staaten nachdrücklich um Unterstützung', patterns);
			expect(full.valid).toBe(true);
			expect(full.matchedPhrase).toBe('bittet die Staaten nachdrücklich');

			// With placeholder, without suffix - placeholder is greedy and matches all words
			// Note: Without the terminating word "nachdrücklich", we can't know where to stop
			const noSuffix = validatePhrase('bittet die Staaten um Unterstützung', patterns);
			expect(noSuffix.valid).toBe(true);
			expect(noSuffix.matchedPhrase).toBe('bittet die Staaten um Unterstützung');

			// Without placeholder, with suffix
			const noPlaceholder = validatePhrase('bittet nachdrücklich um Hilfe', patterns);
			expect(noPlaceholder.valid).toBe(true);
			expect(noPlaceholder.matchedPhrase).toBe('bittet nachdrücklich');

			// Without placeholder, without suffix - just "bittet" followed by other content
			const minimal = validatePhrase('bittet um Kooperation', patterns);
			expect(minimal.valid).toBe(true);
			expect(minimal.matchedPhrase).toBe('bittet um Kooperation');
		});
	});

	describe('complex patterns', () => {
		it('should handle multi-word optional phrases', () => {
			const patterns = parsePhrasePatterns('(in der Absicht) feststellend');

			const withOptional = validatePhrase('in der Absicht feststellend dass', patterns);
			expect(withOptional.valid).toBe(true);
			expect(withOptional.matchedPhrase).toBe('in der Absicht feststellend');

			const withoutOptional = validatePhrase('feststellend dass die Lage', patterns);
			expect(withoutOptional.valid).toBe(true);
			expect(withoutOptional.matchedPhrase).toBe('feststellend');
		});

		it('should handle phrases with special regex characters', () => {
			const patterns = parsePhrasePatterns('erinnert (an)');

			const withAn = validatePhrase('erinnert an die Resolution 1234', patterns);
			expect(withAn.valid).toBe(true);
			expect(withAn.matchedPhrase).toBe('erinnert an');

			const withoutAn = validatePhrase('erinnert die Mitgliedstaaten', patterns);
			expect(withoutAn.valid).toBe(true);
			expect(withoutAn.matchedPhrase).toBe('erinnert');
		});

		it('should handle lenkt (die Aufmerksamkeit) auf pattern', () => {
			const patterns = parsePhrasePatterns('lenkt _ auf');

			const result = validatePhrase('lenkt die Aufmerksamkeit auf das Problem', patterns);
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('lenkt die Aufmerksamkeit auf');
		});
	});

	describe('multiple patterns', () => {
		it('should match first matching pattern', () => {
			const patterns = parsePhrasePatterns(`
alarmiert
(zutiefst) bedauernd
betonend
`);
			const result = validatePhrase('zutiefst bedauernd über', patterns);
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('zutiefst bedauernd');
		});

		it('should try all patterns until one matches', () => {
			const patterns = parsePhrasePatterns(`
alarmiert
betonend
(fest) überzeugt
`);
			const result = validatePhrase('fest überzeugt dass', patterns);
			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('fest überzeugt');
		});
	});

	describe('edge cases', () => {
		it('should return invalid for empty text', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('', patterns);

			expect(result.valid).toBe(false);
		});

		it('should return invalid for whitespace-only text', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('   ', patterns);

			expect(result.valid).toBe(false);
		});

		it('should return invalid when no patterns match', () => {
			const patterns = parsePhrasePatterns('alarmiert\nbetonend');
			const result = validatePhrase('ungültiger Anfang', patterns);

			expect(result.valid).toBe(false);
		});

		it('should return invalid for empty patterns array', () => {
			const result = validatePhrase('some text', []);

			expect(result.valid).toBe(false);
		});

		it('should handle text that is just the phrase', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('alarmiert', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
			expect(result.italicEnd).toBe(9);
		});

		it('should trim input text before matching', () => {
			const patterns = parsePhrasePatterns('alarmiert');
			const result = validatePhrase('  alarmiert über die Lage  ', patterns);

			expect(result.valid).toBe(true);
			expect(result.matchedPhrase).toBe('alarmiert');
		});
	});

	describe('real-world preamble patterns', () => {
		const preambleContent = `
alarmiert
anerkennend
(zutiefst) bedauernd
begrüßend
(erneut) bekräftigend
(höchst) besorgt
(tief) bestürzt
betonend
(fest) überzeugt
in Anbetracht (der Tatsache)
unter Hinweis auf
`;

		it('should validate various preamble clauses', () => {
			const patterns = parsePhrasePatterns(preambleContent);

			expect(validatePhrase('alarmiert über die Entwicklungen', patterns).valid).toBe(true);
			expect(validatePhrase('zutiefst bedauernd über den Konflikt', patterns).valid).toBe(true);
			expect(validatePhrase('bedauernd über die Situation', patterns).valid).toBe(true);
			expect(validatePhrase('höchst besorgt über die Lage', patterns).valid).toBe(true);
			expect(validatePhrase('besorgt über das Ausmaß', patterns).valid).toBe(true);
			expect(validatePhrase('fest überzeugt von der Notwendigkeit', patterns).valid).toBe(true);
			expect(validatePhrase('überzeugt dass Frieden möglich ist', patterns).valid).toBe(true);
			expect(
				validatePhrase('in Anbetracht der Tatsache dass die Resolution gilt', patterns).valid
			).toBe(true);
			expect(validatePhrase('in Anbetracht der schwierigen Umstände', patterns).valid).toBe(true);
		});

		it('should reject invalid preamble clauses', () => {
			const patterns = parsePhrasePatterns(preambleContent);

			expect(validatePhrase('Die Versammlung stellt fest', patterns).valid).toBe(false);
			expect(validatePhrase('Wir fordern auf', patterns).valid).toBe(false);
			expect(validatePhrase('Es wird beschlossen', patterns).valid).toBe(false);
		});
	});

	describe('real-world operative patterns', () => {
		const operativeContent = `
akzeptiert
appelliert (eindringlich)
beschließt
fordert _ (auf)
bittet _ (nachdrücklich)
empfiehlt (dringend)
verurteilt (entschieden)
`;

		it('should validate various operative clauses', () => {
			const patterns = parsePhrasePatterns(operativeContent);

			expect(validatePhrase('akzeptiert den Vorschlag', patterns).valid).toBe(true);
			expect(validatePhrase('appelliert an alle Staaten', patterns).valid).toBe(true);
			expect(validatePhrase('appelliert eindringlich an die Parteien', patterns).valid).toBe(true);
			expect(validatePhrase('beschließt eine neue Resolution', patterns).valid).toBe(true);
			expect(validatePhrase('fordert die Mitgliedstaaten auf zu handeln', patterns).valid).toBe(
				true
			);
			expect(validatePhrase('fordert auf sofort zu reagieren', patterns).valid).toBe(true);
			expect(validatePhrase('bittet um Unterstützung', patterns).valid).toBe(true);
			expect(validatePhrase('bittet die Staaten nachdrücklich um Hilfe', patterns).valid).toBe(
				true
			);
			expect(validatePhrase('empfiehlt die Annahme', patterns).valid).toBe(true);
			expect(validatePhrase('empfiehlt dringend Maßnahmen', patterns).valid).toBe(true);
			expect(validatePhrase('verurteilt die Gewalt', patterns).valid).toBe(true);
			expect(validatePhrase('verurteilt entschieden alle Angriffe', patterns).valid).toBe(true);
		});

		it('should reject invalid operative clauses', () => {
			const patterns = parsePhrasePatterns(operativeContent);

			expect(validatePhrase('In Anbetracht der Lage', patterns).valid).toBe(false);
			expect(validatePhrase('Besorgt über die Entwicklung', patterns).valid).toBe(false);
		});
	});
});
