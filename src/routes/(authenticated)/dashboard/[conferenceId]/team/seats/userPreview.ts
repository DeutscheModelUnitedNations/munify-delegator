/** The person a seat is handed to, as the user search shows them. */
export interface UserPreview {
	id: string;
	email: string;
	given_name: string | null;
	family_name: string | null;
}
