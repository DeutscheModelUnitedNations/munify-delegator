import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query PaymentLayoutQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			longTitle
			accountHolder
			feeAmount
			iban
			bic
			bankName
			currency
		}
	}
`);

export const _PaymentLayoutQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
