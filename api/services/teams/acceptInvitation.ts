import { updateTeamInvitationByToken } from '../../repository/team_invitations.repository';
import { updateTeamMember } from '../../repository/team_members.repository';

export async function acceptInvitation(token: string, type: 'accept' | 'decline'): Promise<boolean> {
  const status = type === 'accept' ? 'active' : 'decline';
  await updateTeamInvitationByToken(token, { status: 'inactive' });
  await updateTeamMember({ invitation_token: token }, { status });
  return true;
}
