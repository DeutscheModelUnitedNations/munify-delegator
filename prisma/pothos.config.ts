module.exports = {
	/** Input type generation config */
	inputs: {
		// this must stay enabled to ensure correct permission application!!
		/** Create simpler inputs for easier customization and ~65% less generated code. Default: `false` */
		simple: true,
		/** How to import the Prisma namespace. Default: `"import { Prisma } from '.prisma/client';"` */
		prismaImporter: "import { Prisma } from '@prisma/client';",
		/** Path to generate the inputs file to from project root. Default: `'./generated/inputs.ts'` */
		outputFilePath: './prisma/generated/graphql/inputs.ts',
		/** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar.
		 *
		 * ATTENTION: Mapping non String requires a conversion inside resolver, once GraphQl ID Input are coerced to String by definition. Default: false */
		mapIdFieldsToGraphqlId: true
	},
	crud: {
		/** How to import the Prisma namespace at the objects.ts file. Default `"import { Prisma } from '.prisma/client';"`. Please use "resolverImports" to import prismaClient at resolvers. */
		prismaImporter: "import { Prisma } from '@prisma/client';",
		/** Any additional imports you might want to add to the resolvers (e.g. your prisma client). Default: `''` */
		resolverImports: "\nimport { db } from '$db/db';",
		/** How to call the prisma client. Default `'_context.prisma'` */
		prismaCaller: 'db',
		/** Directory to generate crud code into from project root. Default: `'./generated'` */
		outputDir: './prisma/generated/graphql',
		/** Export all crud queries/mutations/objects in objects.ts at root dir. Default: true */
		exportEverythingInObjectsDotTs: true,
		/** Map all Prisma fields with "@id" attribute to Graphql "ID" Scalar. Default: 'Objects' */
		mapIdFieldsToGraphqlId: 'Objects'
		/** Change the generated variables from object.base.ts from something like `UserName` to `User_Name`. This avoids generated duplicated names in some cases. See [issue #58](https://github.com/Cauen/prisma-generator-pothos-codegen/issues/58). Default: false */
		// underscoreBetweenObjectVariableNames: false,
	},
	global: {
		builderLocation: 'src/api/resolvers/builder',
		replacer: (input) => {
      //TODO https://github.com/Cauen/prisma-generator-pothos-codegen/issues/76
			return input
				.replaceAll(
					`import {
  FieldOptionsFromKind,
  InputFieldMap,
  InterfaceParam,
  MutationFieldBuilder,
  MutationFieldsShape,
  ObjectRef,
  QueryFieldBuilder,
  QueryFieldsShape,
  TypeParam,
}`,
					`import {
  type FieldOptionsFromKind,
  type InputFieldMap,
  type InterfaceParam,
  MutationFieldBuilder,
  type MutationFieldsShape,
  ObjectRef,
  QueryFieldBuilder,
  type QueryFieldsShape,
  type TypeParam,
}`
				)
				.replaceAll(
					`import {
  PrismaFieldOptions,
  PrismaObjectTypeOptions,
  RelatedFieldOptions,
}`,
					`import {
  type PrismaFieldOptions,
  type PrismaObjectTypeOptions,
  type RelatedFieldOptions,
}`
				);
		}
	}
};
