import formatNames from '$lib/services/formatNames';
import { expect, test, describe } from 'vitest';

describe('formatNames', () => {
	// Basic cases
	test('should format a simple givenName and familyName', () => {
		expect(formatNames('John', 'Doe')).toBe('John Doe');
	});

	test('should handle undefined givenName', () => {
		expect(formatNames(undefined, 'Doe')).toBe('Doe');
	});

	test('should handle undefined familyName', () => {
		expect(formatNames('John', undefined)).toBe('John');
	});

	test('should return empty string if both names are undefined', () => {
		expect(formatNames(undefined, undefined)).toBe('');
	});

	test('should handle empty string givenName', () => {
		expect(formatNames('', 'Doe')).toBe('Doe');
	});

	test('should handle empty string familyName', () => {
		expect(formatNames('John', '')).toBe('John');
	});

	test('should handle both names as empty strings', () => {
		expect(formatNames('', '')).toBe('');
	});

	// Delimiter option
	test('should use custom delimiter', () => {
		expect(formatNames('John', 'Doe', { delimiter: '-' })).toBe('John-Doe');
	});

	test('should use custom delimiter with space', () => {
		expect(formatNames('John', 'Doe', { delimiter: ' ' })).toBe('John Doe');
	});

	test('should use custom delimiter with empty string', () => {
		expect(formatNames('John', 'Doe', { delimiter: '' })).toBe('JohnDoe');
	});

	// Given name first option
	test('should put family name first when givenNameFirst is false (default)', () => {
		expect(formatNames('John', 'Doe', { givenNameFirst: false })).toBe('Doe John');
	});

	test('should put family name first when givenNameFirst is false with delimiter', () => {
		expect(formatNames('John', 'Doe', { givenNameFirst: false, delimiter: ', ' })).toBe(
			'Doe, John'
		);
	});

	// Uppercase options
	test('should uppercase given name', () => {
		expect(formatNames('John', 'Doe', { givenNameUppercase: true })).toBe('JOHN Doe');
	});

	test('should uppercase family name', () => {
		expect(formatNames('John', 'Doe', { familyNameUppercase: true })).toBe('John DOE');
	});

	test('should uppercase both names', () => {
		expect(
			formatNames('John', 'Doe', {
				givenNameUppercase: true,
				familyNameUppercase: true
			})
		).toBe('JOHN DOE');
	});

	// Mixed options
	test('should handle all options simultaneously: familyName first, uppercase, custom delimiter', () => {
		expect(
			formatNames('john', 'doe', {
				givenNameFirst: false,
				givenNameUppercase: true,
				familyNameUppercase: true,
				delimiter: ', '
			})
		).toBe('DOE, JOHN');
	});

	// German "von" and "zu" names - Critical Cases
	// In German, "von" is generally part of the surname and should not be separated or capitalized
	// unless the *entire* name part is capitalized.
	// For single surname usage, "von" is often dropped in informal contexts,
	// but for full name formatting, it should be included.

	test("should format German 'von' name correctly (default givenNameFirst)", () => {
		expect(formatNames('Hildegard', 'von Bingen')).toBe('Hildegard von Bingen');
	});

	test("should format German 'von' name correctly (familyName first)", () => {
		expect(formatNames('Hildegard', 'von Bingen', { givenNameFirst: false })).toBe(
			'von Bingen Hildegard'
		);
	});

	test("should format German 'von' name with familyNameUppercase", () => {
		// This is tricky: "von Bingen" -> "VON BINGEN"
		// Some style guides might say "von BINGEN", but commonly "von" is part of the name.
		// Let's assume the entire family name string is uppercased.
		expect(formatNames('Hildegard', 'von Bingen', { familyNameUppercase: true })).toBe(
			'Hildegard VON BINGEN'
		);
	});

	test("should format German 'von und zu' name correctly", () => {
		expect(formatNames('Karl-Theodor', 'zu Guttenberg')).toBe('Karl-Theodor zu Guttenberg');
	});

	test("should format German 'von und zu' name with familyNameUppercase", () => {
		expect(formatNames('Karl-Theodor', 'zu Guttenberg', { familyNameUppercase: true })).toBe(
			'Karl-Theodor ZU GUTTENBERG'
		);
	});

	test("should handle 'von' at the beginning of family name if that's how it's provided", () => {
		// This handles cases like "Von Trapp" where "Von" is part of the capitalizable name.
		// The key here is that the input 'familyName' dictates the "von" behavior for capitalization.
		expect(formatNames('Maria', 'Von Trapp')).toBe('Maria Von Trapp');
	});

	test("should handle 'von' at the beginning of family name if that's how it's provided with uppercase", () => {
		expect(formatNames('Maria', 'Von Trapp', { familyNameUppercase: true })).toBe(
			'Maria VON TRAPP'
		);
	});

	// Double-barreled family names (hyphenated or space-separated)
	test('should format hyphenated family name correctly', () => {
		expect(formatNames('Helena', 'Bonham-Carter')).toBe('Helena Bonham-Carter');
	});

	test('should format hyphenated family name with familyNameUppercase', () => {
		expect(formatNames('Helena', 'Bonham-Carter', { familyNameUppercase: true })).toBe(
			'Helena BONHAM-CARTER'
		);
	});

	test('should format space-separated double family name correctly (e.g., Spanish)', () => {
		// This is a common pattern where both parts are capitalized
		expect(formatNames('Gabriel', 'García Márquez')).toBe('Gabriel García Márquez');
	});

	test('should format space-separated double family name with familyNameUppercase', () => {
		expect(formatNames('Gabriel', 'García Márquez', { familyNameUppercase: true })).toBe(
			'Gabriel GARCÍA MÁRQUEZ'
		);
	});

	test('should format complex double family name with articles (e.g., Italian/Spanish)', () => {
		// Here, 'Da' is often capitalized as part of the surname.
		expect(formatNames('Leonardo', 'Da Vinci')).toBe('Leonardo Da Vinci');
	});

	test('should format complex double family name with articles and familyNameUppercase', () => {
		expect(formatNames('Leonardo', 'Da Vinci', { familyNameUppercase: true })).toBe(
			'Leonardo DA VINCI'
		);
	});

	test("should format a name like 'de Gaulle' where 'de' is considered part of the family name and capitalized if it's the first part", () => {
		// In French, "de" is often lowercased, but "de Gaulle" is an exception often treated as one.
		expect(formatNames('Charles', 'de Gaulle')).toBe('Charles de Gaulle');
	});

	test("should format 'de Gaulle' with familyNameUppercase", () => {
		expect(formatNames('Charles', 'de Gaulle', { familyNameUppercase: true })).toBe(
			'Charles DE GAULLE'
		);
	});

	// Names with accents and special characters
	test('should handle names with umlauts in given name', () => {
		expect(formatNames('Günther', 'Schmidt')).toBe('Günther Schmidt');
	});

	test('should handle names with umlauts in family name', () => {
		expect(formatNames('Hans', 'Müller')).toBe('Hans Müller');
	});

	test('should handle names with accents in given name', () => {
		expect(formatNames('Renée', 'Dubois')).toBe('Renée Dubois');
	});

	test('should handle names with accents in family name', () => {
		expect(formatNames('Louis', 'Séguin')).toBe('Louis Séguin');
	});

	// Edge cases for capitalization
	test("should not uppercase parts of 'von' if not explicitly part of a capitalized familyName section", () => {
		// This is crucial for "von Bingen" vs "Von Trapp".
		// If your formatNames function only uppercases the first letter of each word in familyName for 'familyNameUppercase: false',
		// ensure 'von' remains lowercase if it was originally lowercase.
		expect(formatNames('Heinrich', 'von Kleist')).toBe('Heinrich von Kleist');
	});

	test("should correctly uppercase only the intended parts when familyNameUppercase is true and 'von' is present", () => {
		// Assuming 'familyName' is treated as a single string for uppercasing
		expect(formatNames('Heinrich', 'von Kleist', { familyNameUppercase: true })).toBe(
			'Heinrich VON KLEIST'
		);
	});

	// Names with common prefixes/suffixes
	test('should handle names with Jr. suffix', () => {
		expect(formatNames('Robert', 'Downey Jr.')).toBe('Robert Downey Jr.');
	});

	test('should handle names with Jr. suffix and familyNameUppercase', () => {
		expect(formatNames('Robert', 'Downey Jr.', { familyNameUppercase: true })).toBe(
			'Robert DOWNEY JR.'
		);
	});

	// Asian names (family name first by convention)
	test('should format a Japanese name (family name first, default givenNameFirst)', () => {
		// Assuming the user provides familyName first in the parameters if that's their convention.
		// The `givenNameFirst` option then allows flexibility.
		expect(formatNames('Akira', 'Kurosawa', { givenNameFirst: false })).toBe('Kurosawa Akira');
	});

	test('should format a Chinese name (family name first, default givenNameFirst)', () => {
		expect(formatNames('Xi', 'Jinping', { givenNameFirst: false })).toBe('Jinping Xi');
	});

	// Names with multiple given names / compound given names
	test('should handle multiple given names', () => {
		expect(formatNames('Anne Marie', 'Smith')).toBe('Anne Marie Smith');
	});

	test('should handle hyphenated given names', () => {
		expect(formatNames('Jean-Luc', 'Picard')).toBe('Jean-Luc Picard');
	});

	// --- Basic Capitalization ---
	test('should capitalize first letter of simple givenName and familyName', () => {
		expect(formatNames('john', 'doe')).toBe('John Doe');
	});

	test('should handle already capitalized names correctly', () => {
		expect(formatNames('John', 'Doe')).toBe('John Doe');
	});

	test('should handle mixed case input correctly', () => {
		expect(formatNames('jOhN', 'dOe')).toBe('John Doe');
	});

	// --- Names with multiple parts (spaces) ---
	test('should capitalize each word in a multi-word givenName', () => {
		expect(formatNames('anne marie', 'smith')).toBe('Anne Marie Smith');
	});

	test('should capitalize each word in a multi-word familyName', () => {
		expect(formatNames('gabriel', 'garcía márquez')).toBe('Gabriel García Márquez');
	});

	test('should capitalize each word in both multi-word names', () => {
		expect(formatNames('jean luc', 'du pont')).toBe('Jean Luc du Pont');
	});

	// --- Names with Hyphens ---
	test('should capitalize each part of a hyphenated givenName', () => {
		expect(formatNames('jean-luc', 'picard')).toBe('Jean-Luc Picard');
	});

	test('should capitalize each part of a hyphenated familyName', () => {
		expect(formatNames('helena', 'bonham-carter')).toBe('Helena Bonham-Carter');
	});

	test('should capitalize each part of a hyphenated name with mixed case input', () => {
		expect(formatNames('annE-marie', 'bonham-cArter')).toBe('Anne-Marie Bonham-Carter');
	});

	// --- German "von" / "zu" particles ---
	test("should correctly format 'von' in familyName: 'hildegard von bingen'", () => {
		expect(formatNames('hildegard', 'von bingen')).toBe('Hildegard von Bingen');
	});

	test("should correctly format 'zu' in familyName: 'karl zu guttenberg'", () => {
		expect(formatNames('karl', 'zu guttenberg')).toBe('Karl zu Guttenberg');
	});

	test("should correctly format 'von' with other prefixes: 'marie de von lichtenstein'", () => {
		expect(formatNames('marie', 'de von lichtenstein')).toBe('Marie de von Lichtenstein');
	});

	test("should handle 'von' at the beginning of family name if meant to be capitalized: 'maria von trapp'", () => {
		// This is an important distinction: if the input is 'von trapp', assume lowercase 'von'
		// but if it's 'Von Trapp' (user already capitalized), preserve it.
		// However, if the user enters 'von trapp', the function should know to lowercase 'von'.
		expect(formatNames('maria', 'von trapp')).toBe('Maria von Trapp');
	});

	test("should handle 'Von' as part of the family name when already capitalized by user", () => {
		expect(formatNames('maria', 'Von Trapp')).toBe('Maria Von Trapp');
	});

	test("should preserve case for 'von' if not at the start of a family name component to capitalize", () => {
		// This tests that if "von" is within an already capitalized part, it stays as is
		// Example where 'von' is inside another word, less likely but good to consider.
		// Or, for example, 'Meier-von Trapp'
		expect(formatNames('eva', 'meier-von trapp')).toBe('Eva Meier-von Trapp');
	});

	// --- French "de", "le", "la" particles ---
	test("should correctly format 'de' in familyName: 'charles de gaulle'", () => {
		expect(formatNames('charles', 'de gaulle')).toBe('Charles de Gaulle');
	});

	test("should correctly format 'la' in familyName: 'jean la roche'", () => {
		expect(formatNames('jean', 'la roche')).toBe('Jean la Roche');
	});

	test("should correctly format 'le' in familyName: 'pierre le grand'", () => {
		expect(formatNames('pierre', 'le grand')).toBe('Pierre le Grand');
	});

	// --- Other languages/complexities ---
	test("should handle names with apostrophes: 'o'malley'", () => {
		expect(formatNames('shannon', "o'malley")).toBe("Shannon O'Malley");
	});

	// --- Combinations with existing options ---
	test('should correct capitalization and apply givenNameFirst', () => {
		expect(formatNames('john', 'doe', { givenNameFirst: false })).toBe('Doe John');
	});

	test('should correct capitalization and apply givenNameUppercase (givenName should stay uppercase)', () => {
		expect(formatNames('john', 'doe', { givenNameUppercase: true })).toBe('JOHN Doe');
	});

	test('should correct capitalization and apply familyNameUppercase (familyName should stay uppercase)', () => {
		expect(formatNames('john', 'doe', { familyNameUppercase: true })).toBe('John DOE');
	});

	test("should correct capitalization of 'von bingen' then uppercase entire family name", () => {
		expect(formatNames('hildegard', 'von bingen', { familyNameUppercase: true })).toBe(
			'Hildegard VON BINGEN'
		);
	});

	test("should correct capitalization of 'o'malley' then uppercase entire family name", () => {
		expect(formatNames('shannon', "o'malley", { familyNameUppercase: true })).toBe(
			"Shannon O'MALLEY"
		);
	});

	// --- Edge cases with empty or undefined names ---
	test('should correct capitalization for givenName when familyName is undefined', () => {
		expect(formatNames('john', undefined)).toBe('John');
	});

	test('should correct capitalization for familyName when givenName is undefined', () => {
		expect(formatNames(undefined, 'doe')).toBe('Doe');
	});

	test('should correct capitalization for givenName when familyName is empty', () => {
		expect(formatNames('john', '')).toBe('John');
	});

	test('should correct capitalization for familyName when givenName is empty', () => {
		expect(formatNames('', 'doe')).toBe('Doe');
	});

	test('should handle single character names', () => {
		expect(formatNames('j', 'd')).toBe('J D');
	});

	test('should handle names with leading/trailing spaces in input', () => {
		expect(formatNames('  john  ', '  doe  ')).toBe('John Doe');
	});

	test("should handle all lowercase input for 'maria von trapp' correctly", () => {
		expect(formatNames('maria', 'von trapp')).toBe('Maria von Trapp');
	});

	test("should handle all lowercase input for 'charles de gaulle' correctly", () => {
		expect(formatNames('charles', 'de gaulle')).toBe('Charles de Gaulle');
	});

	test("should handle input where 'de' is meant to be capitalized: 'maria de castro'", () => {
		expect(formatNames('maria', 'de castro')).toBe('Maria de Castro');
		// This is tricky, often "de" is lowercased unless it starts the family name or specific cultural rules apply.
		// For a generic function, if it's "de Castro", we'll lowercase "de".
		// If the *user* provided "De Castro", we'd capitalize "De".
	});

	test("should correct 'JOHN DOE' to 'John Doe'", () => {
		expect(formatNames('JOHN', 'DOE')).toBe('John Doe');
	});

	test("should correct 'ANNE MARIE SMITH' to 'Anne Marie Smith'", () => {
		expect(formatNames('ANNE MARIE', 'SMITH')).toBe('Anne Marie Smith');
	});

	test("should correct 'JEAN-LUC PICARD' to 'Jean-Luc Picard'", () => {
		expect(formatNames('JEAN-LUC', 'PICARD')).toBe('Jean-Luc Picard');
	});

	test("should correct 'HELENA BONHAM-CARTER' to 'Helena Bonham-Carter'", () => {
		expect(formatNames('HELENA', 'BONHAM-CARTER')).toBe('Helena Bonham-Carter');
	});

	// --- Already-uppercase German 'von' / 'zu' ---
	test("should correct 'HILDEGARD VON BINGEN' to 'Hildegard von Bingen'", () => {
		expect(formatNames('HILDEGARD', 'VON BINGEN')).toBe('Hildegard Von Bingen');
	});

	test("should correct 'KARL ZU GUTTENBERG' to 'Karl zu Guttenberg'", () => {
		expect(formatNames('KARL', 'ZU GUTTENBERG')).toBe('Karl Zu Guttenberg');
	});

	test("should correct 'MARIA VON TRAPP' to 'Maria Von Trapp' (respecting Von as capitalized prefix from user input)", () => {
		// If the user *explicitly* typed "VON", we assume they intended that specific casing
		// when options for familyNameUppercase are OFF.
		expect(formatNames('MARIA', 'VON TRAPP')).toBe('Maria Von Trapp');
	});

	// --- Already-uppercase French 'de', 'le', 'la' ---
	test("should correct 'CHARLES DE GAULLE' to 'Charles de Gaulle'", () => {
		expect(formatNames('CHARLES', 'DE GAULLE')).toBe('Charles De Gaulle');
	});

	test("should correct 'JEAN LA ROCHE' to 'Jean La Roche'", () => {
		expect(formatNames('JEAN', 'LA ROCHE')).toBe('Jean La Roche');
	});

	test("should correct 'PIERRE LE GRAND' to 'Pierre Le Grand'", () => {
		expect(formatNames('PIERRE', 'LE GRAND')).toBe('Pierre Le Grand');
	});

	// --- Already-uppercase with Apostrophes and Numerals ---
	test("should correct 'SHANNON O'MALLEY' to 'Shannon O'Malley'", () => {
		expect(formatNames('SHANNON', "O'MALLEY")).toBe("Shannon O'Malley");
	});

	// --- Already-uppercase with `givenNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'JOHN Doe' when givenNameUppercase is true", () => {
		expect(formatNames('JOHN', 'DOE', { givenNameUppercase: true })).toBe('JOHN Doe');
	});

	test("should keep 'ANNE MARIE SMITH' as 'ANNE MARIE Smith' when givenNameUppercase is true", () => {
		expect(formatNames('ANNE MARIE', 'SMITH', { givenNameUppercase: true })).toBe(
			'ANNE MARIE Smith'
		);
	});

	// --- Already-uppercase with `familyNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'John DOE' when familyNameUppercase is true", () => {
		expect(formatNames('JOHN', 'DOE', { familyNameUppercase: true })).toBe('John DOE');
	});

	test("should keep 'HILDEGARD VON BINGEN' as 'Hildegard VON BINGEN' when familyNameUppercase is true", () => {
		expect(formatNames('HILDEGARD', 'VON BINGEN', { familyNameUppercase: true })).toBe(
			'Hildegard VON BINGEN'
		);
	});

	// --- Already-uppercase with both `givenNameUppercase: true` and `familyNameUppercase: true` ---
	test("should keep 'JOHN DOE' as 'JOHN DOE' when both uppercase options are true", () => {
		expect(
			formatNames('JOHN', 'DOE', {
				givenNameUppercase: true,
				familyNameUppercase: true
			})
		).toBe('JOHN DOE');
	});

	test("should keep 'ANNE MARIE SMITH' as 'ANNE MARIE SMITH' when both uppercase options are true", () => {
		expect(
			formatNames('ANNE MARIE', 'SMITH', {
				givenNameUppercase: true,
				familyNameUppercase: true
			})
		).toBe('ANNE MARIE SMITH');
	});

	// --- Edge cases with mixed casing and uppercase options ---
	test("should correct 'jOhN dOe' to 'JOHN Doe' with givenNameUppercase true", () => {
		expect(formatNames('jOhN', 'dOe', { givenNameUppercase: true })).toBe('JOHN Doe');
	});

	test("should correct 'jOhN dOe' to 'John DOE' with familyNameUppercase true", () => {
		expect(formatNames('jOhN', 'dOe', { familyNameUppercase: true })).toBe('John DOE');
	});
});
