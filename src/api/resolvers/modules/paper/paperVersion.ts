import {
	PaperVersionContentFieldObject,
	PaperVersionCreatedAtFieldObject,
	PaperVersionIdFieldObject,
	PaperVersionPaperFieldObject,
	PaperVersionReviewsFieldObject,
	PaperVersionStatusFieldObject,
	PaperVersionVersionFieldObject
} from '$db/generated/graphql/PaperVersion';
import { builder } from '../../builder';

builder.prismaObject('PaperVersion', {
	fields: (t) => ({
		id: t.field(PaperVersionIdFieldObject),
		version: t.field(PaperVersionVersionFieldObject),
		status: t.field(PaperVersionStatusFieldObject),
		content: t.field(PaperVersionContentFieldObject),
		paper: t.relation('paper', PaperVersionPaperFieldObject),
		reviews: t.relation('reviews', PaperVersionReviewsFieldObject),
		createdAt: t.field(PaperVersionCreatedAtFieldObject)
	})
});
