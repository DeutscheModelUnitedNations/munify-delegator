import {
	PaperVersionContentFieldObject,
	PaperVersionCreatedAtFieldObject,
	PaperVersionIdFieldObject,
	PaperVersionPaperFieldObject,
	PaperVersionReviewsFieldObject,
	PaperVersionStatusFieldObject,
	PaperVersionVersionFieldObject
} from '$db/generated/graphql/PaperVersion';
import { hashEditorContent } from '$lib/components/Paper/Editor/contentHash';
import { builder } from '../../builder';

builder.prismaObject('PaperVersion', {
	fields: (t) => ({
		id: t.field(PaperVersionIdFieldObject),
		version: t.field(PaperVersionVersionFieldObject),
		status: t.field(PaperVersionStatusFieldObject),
		content: t.field(PaperVersionContentFieldObject),
		contentHash: t.string({
			resolve: async (root) => {
				if (!root.content) return '';
				return await hashEditorContent(root.content as string);
			}
		}),
		paper: t.relation('paper'),
		reviews: t.relation('reviews'),
		createdAt: t.field(PaperVersionCreatedAtFieldObject)
	})
});
