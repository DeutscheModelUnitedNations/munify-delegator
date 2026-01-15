// UN Resolution opening phrases for soft validation

// Preambular phrases (participles and adjectives)
export const PREAMBLE_OPENING_PHRASES = [
	// German phrases
	'In Bekräftigung',
	'Anerkennend',
	'Betonend',
	'Feststellend',
	'Unter Hinweis',
	'In Anbetracht',
	'Besorgt',
	'Zutiefst besorgt',
	'Begrüßend',
	'In Erinnerung',
	'Zur Kenntnis nehmend',
	'In Anerkennung',
	'Unterstreichend',
	'Bedauernd',
	'Erfreut',
	'Ermutigt',
	'Überzeugt',
	'Erklärend',
	'In Erwartung',
	'Eingedenk',
	'Unter Berücksichtigung',
	'Nach Prüfung',
	'In dem Bewusstsein',
	'Geleitet von',
	'Im Hinblick auf',
	'Unter Bekräftigung',
	'In Würdigung',
	// English phrases
	'Affirming',
	'Recalling',
	'Noting',
	'Deeply concerned',
	'Concerned',
	'Welcoming',
	'Recognizing',
	'Acknowledging',
	'Bearing in mind',
	'Taking into account',
	'Emphasizing',
	'Reaffirming',
	'Having considered',
	'Having examined',
	'Having reviewed',
	'Expressing',
	'Convinced',
	'Determined',
	'Guided by',
	'Mindful of',
	'Aware of',
	'Alarmed by',
	'Deploring',
	'Observing',
	'Stressing',
	'Taking note',
	'Appreciating',
	'Commending',
	'Deeply alarmed',
	'Deeply appreciating',
	'Deeply regretting',
	'Desiring',
	'Encouraged',
	'Gravely concerned',
	'Keeping in mind',
	'Noting with appreciation',
	'Noting with concern',
	'Noting with satisfaction',
	'Realizing',
	'Recalling also',
	'Recalling further',
	'Regretting',
	'Remaining concerned',
	'Strongly condemning',
	'Underlining',
	'Viewing with appreciation'
];

// Operative verbs (action words)
export const OPERATIVE_OPENING_VERBS = [
	// German verbs
	'Fordert',
	'Beauftragt',
	'Beschließt',
	'Ersucht',
	'Empfiehlt',
	'Ruft auf',
	'Begrüßt',
	'Verurteilt',
	'Bekräftigt',
	'Unterstützt',
	'Ermutigt',
	'Betont',
	'Stellt fest',
	'Erklärt',
	'Bittet',
	'Nimmt Kenntnis',
	'Nimmt zur Kenntnis',
	'Billigt',
	'Genehmigt',
	'Ermächtigt',
	'Verlangt',
	'Bestätigt',
	'Fordert auf',
	'Fordert nachdrücklich',
	'Richtet einen dringenden Appell',
	'Appelliert',
	'Unterstreicht',
	// English verbs
	'Decides',
	'Calls upon',
	'Urges',
	'Requests',
	'Recommends',
	'Encourages',
	'Affirms',
	'Reaffirms',
	'Condemns',
	'Deplores',
	'Expresses',
	'Notes',
	'Supports',
	'Welcomes',
	'Invites',
	'Authorizes',
	'Endorses',
	'Approves',
	'Declares',
	'Demands',
	'Designates',
	'Directs',
	'Establishes',
	'Further decides',
	'Further requests',
	'Further recommends',
	'Also decides',
	'Also requests',
	'Also encourages',
	'Strongly condemns',
	'Strongly urges',
	'Takes note',
	'Emphasizes',
	'Stresses',
	'Underlines',
	'Recalls',
	'Recognizes',
	'Acknowledges',
	'Appeals',
	'Calls for',
	'Commends',
	'Confirms',
	'Considers',
	'Determines',
	'Draws attention',
	'Expresses concern',
	'Expresses appreciation',
	'Looks forward',
	'Regrets',
	'Reiterates',
	'Remains seized',
	'Renews',
	'Resolves'
];

// Helper function to check if text starts with valid phrase
export function validateOpeningPhrase(
	text: string,
	phrases: string[]
): { isValid: boolean; matchedPhrase?: string } {
	const trimmedText = text.trim();
	if (!trimmedText) {
		return { isValid: true }; // Empty is valid (not yet typed)
	}

	for (const phrase of phrases) {
		if (trimmedText.toLowerCase().startsWith(phrase.toLowerCase())) {
			return { isValid: true, matchedPhrase: phrase };
		}
	}

	return { isValid: false };
}

// Get the first word or phrase from text (handles multi-word phrases)
export function getFirstPhrase(text: string): string {
	const trimmed = text.trim();
	// Check for common multi-word phrase patterns
	const multiWordPatterns = [
		/^(In\s+\w+)/i,
		/^(Unter\s+\w+)/i,
		/^(Zur\s+\w+)/i,
		/^(Nach\s+\w+)/i,
		/^(Im\s+\w+)/i,
		/^(Deeply\s+\w+)/i,
		/^(Gravely\s+\w+)/i,
		/^(Strongly\s+\w+)/i,
		/^(Taking\s+\w+)/i,
		/^(Bearing\s+\w+)/i,
		/^(Keeping\s+\w+)/i,
		/^(Having\s+\w+)/i,
		/^(Noting\s+with\s+\w+)/i,
		/^(Further\s+\w+)/i,
		/^(Also\s+\w+)/i,
		/^(Calls\s+\w+)/i,
		/^(Takes\s+\w+)/i,
		/^(Nimmt\s+\w+)/i,
		/^(Fordert\s+\w+)/i,
		/^(Ruft\s+\w+)/i,
		/^(Richtet\s+\w+)/i
	];

	for (const pattern of multiWordPatterns) {
		const match = trimmed.match(pattern);
		if (match) {
			return match[1];
		}
	}

	// Fall back to first word
	return trimmed.split(/[\s,]/)[0];
}
