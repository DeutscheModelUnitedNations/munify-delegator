let nullRating = $state(2.5);
let ratingFactor = $state(1);

let markBonus = $state(0);

let nonWishMalus = $state(-50);

export const getWeights = () => {
	return {
		nullRating,
		ratingFactor,
		markBonus,
		nonWishMalus
	};
};

export const setNullRating = (value: number) => {
	nullRating = value;
};

export const setRatingFactor = (value: number) => {
	ratingFactor = value;
};

export const setMarkBonus = (value: number) => {
	markBonus = value;
};

export const setNonWishMalus = (value: number) => {
	nonWishMalus = value;
};
