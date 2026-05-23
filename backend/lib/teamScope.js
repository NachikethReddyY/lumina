/** Individual-contributor departments whose ticket progress managers track. */
const TEAM_MEMBER_DEPARTMENTS = ['Developers', 'QA'];

function isTeamManager(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'Managers';
}

/** HR admins see organization-wide tickets, people analytics, routing logs, and user directory. */
function isHrAdmin(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'HR';
}

function isOrgViewer(user = {}) {
  return isHrAdmin(user);
}

module.exports = {
  TEAM_MEMBER_DEPARTMENTS,
  isHrAdmin,
  isOrgViewer,
  isTeamManager,
};
