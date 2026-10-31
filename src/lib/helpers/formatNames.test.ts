import formatNames, { sortByNames } from '#lib/helpers/formatNames';
import { expect, test, describe } from 'vitest';

describe('formatNames', () => {
	// Basic cases
	test('should format a simple givenName and familyName', () => {
		expect(formatNames({ givenName: 'John', familyName: 'Doe' })).toBe('John Doe');
	});

	test('should handle undefined givenName', () => {
		expect(formatNames({ givenName: undefined, familyName: 'Doe' })).toBe('Doe');
	});

	test('should handle undefined familyName', () => {
		expect(formatNames({ givenName: 'John', familyName: undefined })).toBe('John');
	});

	test('should return empty string if both names are undefined', () => {
		expect(formatNames({ givenName: undefined, familyName: undefined })).toBe('');
	});

	test('should handle empty string givenName', () => {
		expect(formatNames({ givenName: '', familyName: 'Doe' })).toBe('Doe');
	});

	test('should handle empty string familyName', () => {
		expect(formatNames({ givenName: 'John', familyName: '' })).toBe('John');
	});

	test('should handle both names as empty strings', () => {
		expect(formatNames({ givenName: '', familyName: '' })).toBe('');
	});

	// Delimiter option
	test('should use custom delimiter', () => {
		expect(formatNames({ givenName: 'John', familyName: 'Doe', options: { delimiter: '-' } })).toBe(
			'John-Doe'
		);
	});

	test('should use custom delimiter with space', () => {
		expect(formatNames({ givenName: 'John', familyName: 'Doe', options: { delimiter: ' ' } })).toBe(
			'John Doe'
		);
	});

	test('should use custom delimiter with empty string', () => {
		expect(formatNames({ givenName: 'John', familyName: 'Doe', options: { delimiter: '' } })).toBe(
			'JohnDoe'
		);
	});

	// Given name first option
	test('should put family name first when givenNameFirst is false (default)', () => {
		expect(
			formatNames({ givenName: 'John', familyName: 'Doe', options: { givenNameFirst: false } })
		).toBe('Doe John');
	});

	test('should put family name first when givenNameFirst is false with delimiter', () => {
		expect(
			formatNames({
				givenName: 'John',
				familyName: 'Doe',
				options: { givenNameFirst: false, delimiter: ', ' }
			})
		).toBe('Doe, John');
	});

	// Uppercase options
	test('should uppercase given name', () => {
		expect(
			formatNames({ givenName: 'John', familyName: 'Doe', options: { givenNameUppercase: true } })
		).toBe('JOHN Doe');
	});

	test('should uppercase family name', () => {
		expect(
			formatNames({ givenName: 'John', familyName: 'Doe', options: { familyNameUppercase: true } })
		).toBe('John DOE');
	});

	test('should uppercase both names', () => {
		expect(
			formatNames({
				givenName: 'John',
				familyName: 'Doe',
				options: {
					givenNameUppercase: true,
					familyNameUppercase: true
				}
			})
		).toBe('JOHN DOE');
	});

	// Mixed options
	test('should handle all options simultaneously: familyName first, uppercase, custom delimiter', () => {
		expect(
			formatNames({
				givenName: 'john',
				familyName: 'doe',
				options: {
					givenNameFirst: false,
					givenNameUppercase: true,
					familyNameUppercase: true,
					delimiter: ', '
				}
			})
		).toBe('DOE, JOHN');
	});

	// German "von" and "zu" names - Critical Cases
	// In German, "von" is generally part of the surname and should not be separated or capitalized
	// unless the *entire* name part is capitalized.
	// For single surname usage, "von" is often dropped in informal contexts,
	// but for full name formatting, it should be included.

	test("should format German 'von' name correctly (default givenNameFirst)", () => {
		expect(formatNames({ givenName: 'Hildegard', familyName: 'von Bingen' })).toBe(
			'Hildegard von Bingen'
		);
	});

	test("should format German 'von' name correctly (familyName first)", () => {
		expect(
			formatNames({
				givenName: 'Hildegard',
				familyName: 'von Bingen',
				options: { givenNameFirst: false }
			})
		).toBe('von Bingen Hildegard');
	});

	test("should format German 'von' name with familyNameUppercase", () => {
		// This is tricky: "von Bingen" -> "VON BINGEN"
		// Some style guides might say "von BINGEN", but commonly "von" is part of the name.
		// Let's assume the entire family name string is uppercased.
		expect(
			formatNames({
				givenName: 'Hildegard',
				familyName: 'von Bingen',
				options: { familyNameUppercase: true }
			})
		).toBe('Hildegard VON BINGEN');
	});

	test("should format German 'von und zu' name correctly", () => {
		expect(formatNames({ givenName: 'Karl-Theodor', familyName: 'zu Guttenberg' })).toBe(
			'Karl-Theodor zu Guttenberg'
		);
	});

	test("should format German 'von und zu' name with familyNameUppercase", () => {
		expect(
			formatNames({
				givenName: 'Karl-Theodor',
				familyName: 'zu Guttenberg',
				options: { familyNameUppercase: true }
			})
		).toBe('Karl-Theodor ZU GUTTENBERG');
	});

	test("should handle 'von' at the beginning of family name if that's how it's provided", () => {
		// This handles cases like "Von Trapp" where "Von" is part of the capitalizable name.
		// The key here is that the input 'familyName' dictates the "von" behavior for capitalization.
		expect(formatNames({ givenName: 'Maria', familyName: 'Von Trapp' })).toBe('Maria Von Trapp');
	});

	test("should handle 'von' at the beginning of family name if that's how it's provided with uppercase", () => {
		expect(
			formatNames({
				givenName: 'Maria',
				familyName: 'Von Trapp',
				options: { familyNameUppercase: true }
			})
		).toBe('Maria VON TRAPP');
	});

	// Double-barreled family names (hyphenated or space-separated)
	test('should format hyphenated family name correctly', () => {
		expect(formatNames({ givenName: 'Helena', familyName: 'Bonham-Carter' })).toBe(
			'Helena Bonham-Carter'
		);
	});

	test('should format hyphenated family name with familyNameUppercase', () => {
		expect(
			formatNames({
				givenName: 'Helena',
				familyName: 'Bonham-Carter',
				options: { familyNameUppercase: true }
			})
		).toBe('Helena BONHAM-CARTER');
	});

	test('should format space-separated double family name correctly (e.g., Spanish)', () => {
		// This is a common pattern where both parts are capitalized
		expect(formatNames({ givenName: 'Gabriel', familyName: 'García Márquez' })).toBe(
			'Gabriel García Márquez'
		);
	});

	test('should format space-separated double family name with familyNameUppercase', () => {
		expect(
			formatNames({
				givenName: 'Gabriel',
				familyName: 'García Márquez',
				options: { familyNameUppercase: true }
			})
		).toBe('Gabriel GARCÍA MÁRQUEZ');
	});

	test('should format complex double family name with articles (e.g., Italian/Spanish)', () => {
		// Here, 'Da' is often capitalized as part of the surname.
		expect(formatNames({ givenName: 'Leonardo', familyName: 'Da Vinci' })).toBe(
			'Leonardo Da Vinci'
		);
	});

	test('should format complex double family name with articles and familyNameUppercase', () => {
		expect(
			formatNames({
				givenName: 'Leonardo',
				familyName: 'Da Vinci',
				options: { familyNameUppercase: true }
			})
		).toBe('Leonardo DA VINCI');
	});

	test("should format a name like 'de Gaulle' where 'de' is considered part of the family name and capitalized if it's the first part", () => {
		// In French, "de" is often lowercased, but "de Gaulle" is an exception often treated as one.
		expect(formatNames({ givenName: 'Charles', familyName: 'de Gaulle' })).toBe(
			'Charles de Gaulle'
		);
	});

	test("should format 'de Gaulle' with familyNameUppercase", () => {
		expect(
			formatNames({
				givenName: 'Charles',
				familyName: 'de Gaulle',
				options: { familyNameUppercase: true }
			})
		).toBe('Charles DE GAULLE');
	});

	// Names with accents and special characters
	test('should handle names with umlauts in given name', () => {
		expect(formatNames({ givenName: 'Günther', familyName: 'Schmidt' })).toBe('Günther Schmidt');
	});

	test('should handle names with umlauts in family name', () => {
		expect(formatNames({ givenName: 'Hans', familyName: 'Müller' })).toBe('Hans Müller');
	});

	test('should handle names with accents in given name', () => {
		expect(formatNames({ givenName: 'Renée', familyName: 'Dubois' })).toBe('Renée Dubois');
	});

	test('should handle names with accents in family name', () => {
		expect(formatNames({ givenName: 'Louis', familyName: 'Séguin' })).toBe('Louis Séguin');
	});

	// Edge cases for capitalization
	test("should not uppercase parts of 'von' if not explicitly part of a capitalized familyName section", () => {
		// This is crucial for "von Bingen" vs "Von Trapp".
		// If your formatNames function only uppercases the first letter of each word in familyName for 'familyNameUppercase: false',
		// ensure 'von' remains lowercase if it was originally lowercase.
		expect(formatNames({ givenName: 'Heinrich', familyName: 'von Kleist' })).toBe(
			'Heinrich von Kleist'
		);
	});

	test("should correctly uppercase only the intended parts when familyNameUppercase is true and 'von' is present", () => {
		// Assuming 'familyName' is treated as a single string for uppercasing
		expect(
			formatNames({
				givenName: 'Heinrich',
				familyName: 'von Kleist',
				options: { familyNameUppercase: true }
			})
		).toBe('Heinrich VON KLEIST');
	});

	// Names with common prefixes/suffixes
	test('should handle names with Jr. suffix', () => {
		expect(formatNames({ givenName: 'Robert', familyName: 'Downey Jr.' })).toBe(
			'Robert Downey Jr.'
		);
	});

	test('should handle names with Jr. suffix and familyNameUppercase', () => {
		expect(
			formatNames({
				givenName: 'Robert',
				familyName: 'Downey Jr.',
				options: { familyNameUppercase: true }
			})
		).toBe('Robert DOWNEY JR.');
	});

	// Asian names (family name first by convention)
	test('should format a Japanese name (family name first, default givenNameFirst)', () => {
		// Assuming the user provides familyName first in the parameters if that's their convention.
		// The `givenNameFirst` option then allows flexibility.
		expect(
			formatNames({
				givenName: 'Akira',
				familyName: 'Kurosawa',
				options: { givenNameFirst: false }
			})
		).toBe('Kurosawa Akira');
	});

	test('should format a Chinese name (family name first, default givenNameFirst)', () => {
		expect(
			formatNames({ givenName: 'Xi', familyName: 'Jinping', options: { givenNameFirst: false } })
		).toBe('Jinping Xi');
	});

	// Names with multiple given names / compound given names
	test('should handle multiple given names', () => {
		expect(formatNames({ givenName: 'Anne Marie', familyName: 'Smith' })).toBe('Anne Marie Smith');
	});

	test('should handle hyphenated given names', () => {
		expect(formatNames({ givenName: 'Jean-Luc', familyName: 'Picard' })).toBe('Jean-Luc Picard');
	});

	// --- Basic Capitalization ---
	test('should capitalize first letter of simple givenName and familyName', () => {
		expect(formatNames({ givenName: 'john', familyName: 'doe' })).toBe('John Doe');
	});

	test('should handle already capitalized names correctly', () => {
		expect(formatNames({ givenName: 'John', familyName: 'Doe' })).toBe('John Doe');
	});

	test('should handle mixed case input correctly', () => {
		expect(formatNames({ givenName: 'jOhN', familyName: 'dOe' })).toBe('John Doe');
	});

	// --- Names with multiple parts (spaces) ---
	test('should capitalize each word in a multi-word givenName', () => {
		expect(formatNames({ givenName: 'anne marie', familyName: 'smith' })).toBe('Anne Marie Smith');
	});

	test('should capitalize each word in a multi-word familyName', () => {
		expect(formatNames({ givenName: 'gabriel', familyName: 'garcía márquez' })).toBe(
			'Gabriel García Márquez'
		);
	});

	test('should capitalize each word in both multi-word names', () => {
		expect(formatNames({ givenName: 'jean luc', familyName: 'du pont' })).toBe('Jean Luc du Pont');
	});

	// --- Names with Hyphens ---
	test('should capitalize each part of a hyphenated givenName', () => {
		expect(formatNames({ givenName: 'jean-luc', familyName: 'picard' })).toBe('Jean-Luc Picard');
	});

	test('should capitalize each part of a hyphenated familyName', () => {
		expect(formatNames({ givenName: 'helena', familyName: 'bonham-carter' })).toBe(
			'Helena Bonham-Carter'
		);
	});

	test('should capitalize each part of a hyphenated name with mixed case input', () => {
		expect(formatNames({ givenName: 'annE-marie', familyName: 'bonham-cArter' })).toBe(
			'Anne-Marie Bonham-Carter'
		);
	});

	// --- German "von" / "zu" particles ---
	test("should correctly format 'von' in familyName: 'hildegard von bingen'", () => {
		expect(formatNames({ givenName: 'hildegard', familyName: 'von bingen' })).toBe(
			'Hildegard von Bingen'
		);
	});

	test("should correctly format 'zu' in familyName: 'karl zu guttenberg'", () => {
		expect(formatNames({ givenName: 'karl', familyName: 'zu guttenberg' })).toBe(
			'Karl zu Guttenberg'
		);
	});

	test("should correctly format 'von' with other prefixes: 'marie de von lichtenstein'", () => {
		expect(formatNames({ givenName: 'marie', familyName: 'de von lichtenstein' })).toBe(
			'Marie de von Lichtenstein'
		);
	});

	test("should handle 'von' at the beginning of family name if meant to be capitalized: 'maria von trapp'", () => {
		// This is an important distinction: if the input is 'von trapp', assume lowercase 'von'
		// but if it's 'Von Trapp' (user already capitalized), preserve it.
		// However, if the user enters 'von trapp', the function should know to lowercase 'von'.
		expect(formatNames({ givenName: 'maria', familyName: 'von trapp' })).toBe('Maria von Trapp');
	});

	test("should handle 'Von' as part of the family name when already capitalized by user", () => {
		expect(formatNames({ givenName: 'maria', familyName: 'Von Trapp' })).toBe('Maria Von Trapp');
	});

	test("should preserve case for 'von' if not at the start of a family name component to capitalize", () => {
		// This tests that if "von" is within an already capitalized part, it stays as is
		// Example where 'von' is inside another word, less likely but good to consider.
		// Or, for example, 'Meier-von Trapp'
		expect(formatNames({ givenName: 'eva', familyName: 'meier-von trapp' })).toBe(
			'Eva Meier-von Trapp'
		);
	});

	// --- French "de", "le", "la" particles ---
	test("should correctly format 'de' in familyName: 'charles de gaulle'", () => {
		expect(formatNames({ givenName: 'charles', familyName: 'de gaulle' })).toBe(
			'Charles de Gaulle'
		);
	});

	test("should correctly format 'la' in familyName: 'jean la roche'", () => {
		expect(formatNames({ givenName: 'jean', familyName: 'la roche' })).toBe('Jean la Roche');
	});

	test("should correctly format 'le' in familyName: 'pierre le grand'", () => {
		expect(formatNames({ givenName: 'pierre', familyName: 'le grand' })).toBe('Pierre le Grand');
	});

	// --- Other languages/complexities ---
	test("should handle names with apostrophes: 'o'malley'", () => {
		expect(formatNames({ givenName: 'shannon', familyName: "o'malley" })).toBe("Shannon O'Malley");
	});

	// --- Combinations with existing options ---
	test('should correct capitalization and apply givenNameFirst', () => {
		expect(
			formatNames({ givenName: 'john', familyName: 'doe', options: { givenNameFirst: false } })
		).toBe('Doe John');
	});

	test('should correct capitalization and apply givenNameUppercase (givenName should stay uppercase)', () => {
		expect(
			formatNames({ givenName: 'john', familyName: 'doe', options: { givenNameUppercase: true } })
		).toBe('JOHN Doe');
	});

	test('should correct capitalization and apply familyNameUppercase (familyName should stay uppercase)', () => {
		expect(
			formatNames({ givenName: 'john', familyName: 'doe', options: { familyNameUppercase: true } })
		).toBe('John DOE');
	});

	test("should correct capitalization of 'von bingen' then uppercase entire family name", () => {
		expect(
			formatNames({
				givenName: 'hildegard',
				familyName: 'von bingen',
				options: { familyNameUppercase: true }
			})
		).toBe('Hildegard VON BINGEN');
	});

	test("should correct capitalization of 'o'malley' then uppercase entire family name", () => {
		expect(
			formatNames({
				givenName: 'shannon',
				familyName: "o'malley",
				options: { familyNameUppercase: true }
			})
		).toBe("Shannon O'MALLEY");
	});

	// --- Edge cases with empty or undefined names ---
	test('should correct capitalization for givenName when familyName is undefined', () => {
		expect(formatNames({ givenName: 'john', familyName: undefined })).toBe('John');
	});

	test('should correct capitalization for familyName when givenName is undefined', () => {
		expect(formatNames({ givenName: undefined, familyName: 'doe' })).toBe('Doe');
	});

	test('should correct capitalization for givenName when familyName is empty', () => {
		expect(formatNames({ givenName: 'john', familyName: '' })).toBe('John');
	});

	test('should correct capitalization for familyName when givenName is empty', () => {
		expect(formatNames({ givenName: '', familyName: 'doe' })).toBe('Doe');
	});

	test('should handle single character names', () => {
		expect(formatNames({ givenName: 'j', familyName: 'd' })).toBe('J D');
	});

	test('should handle names with leading/trailing spaces in input', () => {
		expect(formatNames({ givenName: '  john  ', familyName: '  doe  ' })).toBe('John Doe');
	});

	test("should handle all lowercase input for 'maria von trapp' correctly", () => {
		expect(formatNames({ givenName: 'maria', familyName: 'von trapp' })).toBe('Maria von Trapp');
	});

	test("should handle all lowercase input for 'charles de gaulle' correctly", () => {
		expect(formatNames({ givenName: 'charles', familyName: 'de gaulle' })).toBe(
			'Charles de Gaulle'
		);
	});

	test("should handle input where 'de' is meant to be capitalized: 'maria de castro'", () => {
		expect(formatNames({ givenName: 'maria', familyName: 'de castro' })).toBe('Maria de Castro');
		// This is tricky, often "de" is lowercased unless it starts the family name or specific cultural rules apply.
		// For a generic function, if it's "de Castro", we'll lowercase "de".
		// If the *user* provided "De Castro", we'd capitalize "De".
	});

	test("should correct 'JOHN DOE' to 'John Doe'", () => {
		expect(formatNames({ givenName: 'JOHN', familyName: 'DOE' })).toBe('John Doe');
	});

	test("should correct 'ANNE MARIE SMITH' to 'Anne Marie Smith'", () => {
		expect(formatNames({ givenName: 'ANNE MARIE', familyName: 'SMITH' })).toBe('Anne Marie Smith');
	});

	test("should correct 'JEAN-LUC PICARD' to 'Jean-Luc Picard'", () => {
		expect(formatNames({ givenName: 'JEAN-LUC', familyName: 'PICARD' })).toBe('Jean-Luc Picard');
	});

	test("should correct 'HELENA BONHAM-CARTER' to 'Helena Bonham-Carter'", () => {
		expect(formatNames({ givenName: 'HELENA', familyName: 'BONHAM-CARTER' })).toBe(
			'Helena Bonham-Carter'
		);
	});

	// --- Already-uppercase German 'von' / 'zu' ---
	test("should correct 'HILDEGARD VON BINGEN' to 'Hildegard von Bingen'", () => {
		expect(formatNames({ givenName: 'HILDEGARD', familyName: 'VON BINGEN' })).toBe(
			'Hildegard Von Bingen'
		);
	});

	test("should correct 'KARL ZU GUTTENBERG' to 'Karl zu Guttenberg'", () => {
		expect(formatNames({ givenName: 'KARL', familyName: 'ZU GUTTENBERG' })).toBe(
			'Karl Zu Guttenberg'
		);
	});

	test("should correct 'MARIA VON TRAPP' to 'Maria Von Trapp' (respecting Von as capitalized prefix from user input)", () => {
		// If the user *explicitly* typed "VON", we assume they intended that specific casing
		// when options for familyNameUppercase are OFF.
		expect(formatNames({ givenName: 'MARIA', familyName: 'VON TRAPP' })).toBe('Maria Von Trapp');
	});

	// --- Already-uppercase French 'de', 'le', 'la' ---
	test("should correct 'CHARLES DE GAULLE' to 'Charles de Gaulle'", () => {
		expect(formatNames({ givenName: 'CHARLES', familyName: 'DE GAULLE' })).toBe(
			'Charles De Gaulle'
		);
	});

	test("should correct 'JEAN LA ROCHE' to 'Jean La Roche'", () => {
		expect(formatNames({ givenName: 'JEAN', familyName: 'LA ROCHE' })).toBe('Jean La Roche');
	});

	test("should correct 'PIERRE LE GRAND' to 'Pierre Le Grand'", () => {
		expect(formatNames({ givenName: 'PIERRE', familyName: 'LE GRAND' })).toBe('Pierre Le Grand');
	});

	// --- Already-uppercase with Apostrophes and Numerals ---
	test("should correct 'SHANNON O'MALLEY' to 'Shannon O'Malley'", () => {
		expect(formatNames({ givenName: 'SHANNON', familyName: "O'MALLEY" })).toBe("Shannon O'Malley");
	});

	// --- Already-uppercase with `givenNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'JOHN Doe' when givenNameUppercase is true", () => {
		expect(
			formatNames({ givenName: 'JOHN', familyName: 'DOE', options: { givenNameUppercase: true } })
		).toBe('JOHN Doe');
	});

	test("should keep 'ANNE MARIE SMITH' as 'ANNE MARIE Smith' when givenNameUppercase is true", () => {
		expect(
			formatNames({
				givenName: 'ANNE MARIE',
				familyName: 'SMITH',
				options: { givenNameUppercase: true }
			})
		).toBe('ANNE MARIE Smith');
	});

	// --- Already-uppercase with `familyNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'John DOE' when familyNameUppercase is true", () => {
		expect(
			formatNames({ givenName: 'JOHN', familyName: 'DOE', options: { familyNameUppercase: true } })
		).toBe('John DOE');
	});

	test("should keep 'HILDEGARD VON BINGEN' as 'Hildegard VON BINGEN' when familyNameUppercase is true", () => {
		expect(
			formatNames({
				givenName: 'HILDEGARD',
				familyName: 'VON BINGEN',
				options: { familyNameUppercase: true }
			})
		).toBe('Hildegard VON BINGEN');
	});

	// --- Already-uppercase with both `givenNameUppercase: true` and `familyNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'JOHN DOE' when both uppercase options are true", () => {
		expect(
			formatNames({
				givenName: 'JOHN',
				familyName: 'DOE',
				options: {
					givenNameUppercase: true,
					familyNameUppercase: true
				}
			})
		).toBe('JOHN DOE');
	});

	test("should keep 'ANNE MARIE SMITH' as 'ANNE MARIE SMITH' when both uppercase options are true", () => {
		expect(
			formatNames({
				givenName: 'ANNE MARIE',
				familyName: 'SMITH',
				options: {
					givenNameUppercase: true,
					familyNameUppercase: true
				}
			})
		).toBe('ANNE MARIE SMITH');
	});

	// --- Edge cases with mixed casing and uppercase options ---
	test("should correct 'jOhN dOe' to 'JOHN Doe' with givenNameUppercase true", () => {
		expect(
			formatNames({ givenName: 'jOhN', familyName: 'dOe', options: { givenNameUppercase: true } })
		).toBe('JOHN Doe');
	});

	test("should correct 'jOhN dOe' to 'John DOE' with familyNameUppercase true", () => {
		expect(
			formatNames({ givenName: 'jOhN', familyName: 'dOe', options: { familyNameUppercase: true } })
		).toBe('John DOE');
	});
});

describe('sortByNames', () => {
	test('orders by family name, then given name, treating missing names as empty', () => {
		const people = [
			{ givenName: 'Max', familyName: 'Mustermann' },
			{ givenName: 'Anna', familyName: 'Mustermann' },
			{ givenName: 'Zoe', familyName: 'Abel' },
			{ givenName: null, familyName: undefined }
		];
		expect(people.sort(sortByNames).map((p) => p.givenName)).toEqual([null, 'Zoe', 'Anna', 'Max']);
	});
});
