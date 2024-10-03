import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidcPlugin';

export const defineAbilitiesForUserEntity = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;
		can(['read', 'update'], 'User', { id: user.sub });

		//TODO find out if overwriting rules is a thing and if this causes permissions
		// to not be applied correctly

		// delegates should see each other
		can(['list', 'read'], 'User', {
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
		});

		// supervisors should see their delegates
		can(['list', 'read'], 'User', {
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
		});

		// delegates should see their supervisors
		can(['list', 'read'], 'User', {
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
		});

		// supervisors should see each other
		can(['list', 'read'], 'User', {
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
		});

		// team members should see each other
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

		// team members should see delegates in the conferences they manage
		can(['list', 'read'], 'User', {
			delegationMemberships: {
				some: {
					conference: {
						teamMembers: {
							some: {
								role: {
									in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
								},
								user: {
									id: user.sub
								}
							}
						}
					}
				}
			}
		});

		// team members should see single participants in the conferences they manage
		can(['list', 'read'], 'User', {
			singleParticipant: {
				some: {
					conference: {
						teamMembers: {
							some: {
								role: {
									in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
								},
								user: {
									id: user.sub
								}
							}
						}
					}
				}
			}
		});

		// team members should see supervisors in the conferences they manage
		can(['list', 'read'], 'User', {
			conferenceSupervisor: {
				some: {
					conference: {
						teamMembers: {
							some: {
								role: {
									in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
								},
								user: {
									id: user.sub
								}
							}
						}
					}
				}
			}
		});
	}
};
