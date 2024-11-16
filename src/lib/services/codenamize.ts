import { codenamize } from 'codenamize-ts';
const codenmz = (input: string | number): string => {
	codenamize.use({
		adverb: [
			'very',
			'not-so',
			'super',
			'ultra',
			'mega',
			'extra',
			'uber',
			'quite',
			'not-very',
			'not-at-all',
			'slightly',
			'somewhat',
			'totally',
			'absolutely',
			'fairly',
			'really',
			'mildly',
			'extremely',
			'overly',
			'incredibly',
			'particularly',
			'remarkably',
			'unusually',
			'especially',
			'exceptionally',
			'extraordinarily',
			'tremendously',
			'vastly',
			'hugely',
			'immensely',
			'colossally',
			'staggeringly',
			'phenomenally',
			'fantastically',
			'awfully',
			'terribly',
			'dreadfully',
			'horribly',
			'frightfully',
			'shockingly',
			'alarmingly',
			'distressingly'
		],
		mood: [
			'happy',
			'sad',
			'angry',
			'calm',
			'excited',
			'bored',
			'tired',
			'energetic',
			'lazy',
			'busy',
			'hopeful',
			'frustrated',
			'content',
			'anxious',
			'relaxed',
			'curious',
			'motivated',
			'cheerful',
			'disappointed',
			'determined',
			'pensive',
			'confused',
			'overwhelmed',
			'stressed',
			'optimistic',
			'pessimistic',
			'confident',
			'sublime',
			'magnificent',
			'grand',
			'majestic',
			'imposing',
			'splendid',
			'glorious',
			'noble',
			'resplendent',
			'exalted',
			'august',
			'lofty',
			'elevated',
			'dignified'
		],
		unNoun: [
			'Trygve-Lie',
			'Dag-Hammarskjöld',
			'U-Thant',
			'Kurt-Waldheim',
			'Javier-Perez-de-Cuellar',
			'Boutros-Boutros-Ghali',
			'Kofi-Annan',
			'Ban-Ki-moon',
			'António-Guterres'
		]
	});
	return codenamize({
		seed: input,
		particles: ['adverb', 'mood', 'unNoun'],
		separator: ' ',
		capitalize: true
	});
};

export default codenmz;