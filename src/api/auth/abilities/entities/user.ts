import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForUserEntity = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;
		can(['read', 'update'], 'User', { id: user.sub });

		//TODO find out if overwriting rules is a thing and if this causes permissions
		// to not be applied correctly
		can(['list', 'read'], 'User', {
			OR: [
				// I am a delegation member and want to see the other delegation members
				{
					delegationMemberships: {
						some: {
							delegation: {
								members: {
									some: {
										user: {
											id: user.sub
										}
									}
								}
							}
						}
					}
				},
				// I am a Supervisor and want to see my delegation members
				{
					delegationMemberships: {
						some: {
							delegation: {
								supervisors: {
									some: {
										user: {
											id: user.sub
										}
									}
								}
							}
						}
					}
				},
				// I am a delegation member and want to see my supervisors
				{
					conferenceSupervisor: {
						some: {
							delegations: {
								some: {
									members: {
										some: {
											user: {
												id: user.sub
											}
										}
									}
								}
							}
						}
					}
				},
				//  I am a Supervisor and want to see other supervisors
				{
					conferenceSupervisor: {
						some: {
							delegations: {
								some: {
									supervisors: {
										some: {
											user: {
												id: user.sub
											}
										}
									}
								}
							}
						}
					}
				}
			]
		});

		// I want to see my other team members on my conference
		can(['list', 'read'], 'User', {
			teamMember: {
				some: {
					conference: {
						teamMembers: {
							some: {
								user: {
									id: user.sub
								}
							}
						}
					}
				}
			}
		});

		can(['list', 'read'], 'User', {
			OR: [
				// I am Project Managment or Participant Care and can see every delegate within the conference
				{
					delegationMemberships: {
						some: {
							conference: {
								teamMembers: {
									some: {
										OR: [
											{
												role: 'PROJECT_MANAGEMENT'
											},
											{
												role: 'PARTICIPANT_CARE'
											}
										],
										user: {
											id: user.sub
										}
									}
								}
							}
						}
					}
				},
				// I am Project Managment or Participant Care and can see every single participant within the conference
				{
					singleParticipant: {
						some: {
							conference: {
								teamMembers: {
									some: {
										OR: [
											{
												role: 'PROJECT_MANAGEMENT'
											},
											{
												role: 'PARTICIPANT_CARE'
											}
										],
										user: {
											id: user.sub
										}
									}
								}
							}
						}
					}
				},
				// I am Project Managment or Participant Care and can see every single supervisor within the conference
				{
					conferenceSupervisor: {
						some: {
							conference: {
								teamMembers: {
									some: {
										OR: [
											{
												role: 'PROJECT_MANAGEMENT'
											},
											{
												role: 'PARTICIPANT_CARE'
											}
										],
										user: {
											id: user.sub
										}
									}
								}
							}
						}
					}
				}
			]
		});
	}
};
