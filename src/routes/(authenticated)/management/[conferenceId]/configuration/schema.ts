import { Type } from '@sinclair/typebox';

export const conferenceConfigFormSchema = Type.Object({
	title: Type.String({error: "dwaaw"}),
	longTitle: Type.String(),
	location: Type.String(),
	language: Type.String(),
	website: Type.String(),
	imageDataUrl: Type.String(),
	startRegistration: Type.Date(),
	startAssignment: Type.Date(),
	startConference: Type.Date(),
	endConference: Type.Date()
});
