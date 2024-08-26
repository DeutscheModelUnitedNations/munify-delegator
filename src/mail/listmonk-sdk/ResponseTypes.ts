export type Attribs = Record<string, string | number | boolean>;

export interface GetSubscribersResponse {
	data: Data;
}
interface Data {
	results: ResultsItem[];
	query: string;
	total: number;
	per_page: number;
	page: number;
}
interface ResultsItem {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	email: string;
	name: string;
	attribs: Attribs;
	status: string;
	lists: ListsItem[];
}
interface ListsItem {
	subscription_status: string;
	id: number;
	uuid: string;
	name: string;
	type: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface CreateSubscriberResponse {
	data: Data;
}
interface Data {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	email: string;
	name: string;
	attribs: Attribs;
	status: string;
	lists: ListsItem[];
}
interface ListsItem {
	subscription_status: string;
	id: number;
	uuid: string;
	name: string;
	type: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface BaseBooleanConfirmation {
	data: boolean;
}

interface GetSubscriberResponse {
	data: Data;
}
interface Data {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	email: string;
	name: string;
	attribs: Attribs;
	status: string;
	lists: ListsItem[];
}
interface ListsItem {
	subscription_status: string;
	id: number;
	uuid: string;
	name: string;
	type: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface UpdateSubscriberResponse extends CreateSubscriberResponse {}

export interface getListResponse {
	data: ResultsItems;
}
export interface ResultsItems {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	name: string;
	type: string;
	optin: string;
	tags: string[];
	subscriber_count: number;
}

export interface GetListsResponse {
	data: GetListsResponseData;
}
interface GetListsResponseData {
	results: GetListsResponseResultsItems[];
	total: number;
	per_page: number;
	page: number;
}
interface GetListsResponseResultsItems {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	name: string;
	type: string;
	optin: string;
	tags: string[];
	subscriber_count: number;
}

export interface GetListResponse {
	data: GetListsResponseResultsItems;
}

export interface CreateListResponse extends GetListResponse {}
export interface UpdateListResponse extends GetListResponse {}
