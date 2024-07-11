import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { apiClient } from "$api/client";

export const load: PageLoad = ({ params, fetch }) => {
	if (params.conferenceId === undefined) error(404, "Not found");

	apiClient(fetch).api.index.get();

	return {
		conferenceId: params.conferenceId,
		testData: [
			{
				conferenceId: 1,
				conferenceName: "MUN-SH 2025",
				active: true,
				accepted: true,
			},
			{
				conferenceId: 2,
				conferenceName: "MUNBW 2025",
				active: true,
				accepted: false,
			},
			{
				conferenceId: 3,
				conferenceName: "MUN-SH 2024",
				active: false,
				accepted: true,
			},
		],
	};
};
