import type { DashboardSurveyPageQueryVariables } from './$houdini';

export const _DashboardSurveyPageQueryVariables: DashboardSurveyPageQueryVariables = async (
	event
) => {
	const { user } = await event.parent();

	return {
		userId: user.sub
	};
};
