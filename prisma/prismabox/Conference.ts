import { t } from "elysia";

import { __nullable__ } from "./__nullable__";

export const ConferencePlain = t.Object(
  {
    id: t.String({ additionalProperties: false }),
    title: t.String({ additionalProperties: false }),
    start: __nullable__(t.Date({ additionalProperties: false })),
    end: __nullable__(t.Date({ additionalProperties: false })),
    location: __nullable__(t.String({ additionalProperties: false })),
    website: __nullable__(t.String({ additionalProperties: false })),
    image: __nullable__(t.Uint8Array({ additionalProperties: false })),
    // __typename: t.Any()
  },
  { additionalProperties: true },
);

export const ConferenceRelations = t.Object(
  {},
  { additionalProperties: false },
);

export const ConferencePlainInput = t.Object(
  {
    title: t.String({ additionalProperties: false }),
    start: t.Optional(__nullable__(t.Date({ additionalProperties: false }))),
    end: t.Optional(__nullable__(t.Date({ additionalProperties: false }))),
    location: t.Optional(
      __nullable__(t.String({ additionalProperties: false })),
    ),
    website: t.Optional(
      __nullable__(t.String({ additionalProperties: false })),
    ),
    image: t.Optional(
      __nullable__(t.Uint8Array({ additionalProperties: false })),
    ),
  },
  { additionalProperties: false },
);

export const ConferenceRelationsInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const ConferenceRelationsInputUpdate = t.Partial(
  t.Object({}, { additionalProperties: false }),
  { additionalProperties: false },
);

export const ConferenceWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String({ additionalProperties: false }),
          title: t.String({ additionalProperties: false }),
          start: t.Date({ additionalProperties: false }),
          end: t.Date({ additionalProperties: false }),
          location: t.String({ additionalProperties: false }),
          website: t.String({ additionalProperties: false }),
          image: t.Uint8Array({ additionalProperties: false }),
        },
        { additionalProperties: false },
      ),
    { $id: "Conference" },
  ),
  { additionalProperties: false },
);

export const ConferenceWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String({ additionalProperties: false }) },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String({ additionalProperties: false }) })], {
          additionalProperties: false,
        }),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object({
            title: t.String({ additionalProperties: false }),
            start: t.Date({ additionalProperties: false }),
            end: t.Date({ additionalProperties: false }),
            location: t.String({ additionalProperties: false }),
            website: t.String({ additionalProperties: false }),
            image: t.Uint8Array({ additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Conference" },
);

export const Conference = t.Composite([ConferencePlain, ConferenceRelations], {
  additionalProperties: false,
});

export const ConferenceInputCreate = t.Composite(
  [ConferencePlainInput, ConferenceRelationsInputCreate],
  { additionalProperties: false },
);

export const ConferenceInputUpdate = t.Composite(
  [ConferencePlainInput, ConferenceRelationsInputUpdate],
  { additionalProperties: false },
);
