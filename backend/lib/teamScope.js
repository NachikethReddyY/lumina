/** Individual-contributor departments whose ticket progress managers track. */
const TEAM_MEMBER_DEPARTMENTS = ['Developers', 'QA'];

// Department/role predicates shared by route guards and ticket visibility
// filters. These mirror frontend concepts in src/utils/orgRoles.ts and keep
// dashboards, directories, and queues from drifting in access semantics.
function isTeamManager(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'Managers';
}

function isQaManager(user = {}) {
  if (user.role !== 'admin' || String(user.department || '').trim() !== 'Managers') return false;
  const title = String(user.job_title || '').toLowerCase();
  return title.includes('qa') && (title.includes('manager') || title.includes('lead'));
}

/** HR admins see organization-wide tickets, people analytics, routing logs, and user directory. */
function isHrAdmin(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'HR';
}

function isOrgViewer(user = {}) {
  return isHrAdmin(user) || isTeamManager(user) || isQaManager(user);
}

function canViewOrgQueue(user = {}) {
  if (!user?.id) return false;
  if (user.status && user.status !== 'active') return false;
  if (isOrgViewer(user)) return true;
  const dept = String(user.department || '').trim();
  if (dept === 'QA') return true;
  return isDeveloper(user);
}

function canAccessUserDirectory(user = {}) {
  return isHrAdmin(user) || isTeamManager(user);
}

function isDeveloper(user = {}) {
  if (!user?.job_title && !user?.department) return false;
  const title = String(user.job_title || '').toLowerCase();
  const dept = String(user.department || '').trim();
  if (dept === 'Developers') return true;
  const devKeywords = ['developer', 'engineer', 'software', 'dev', 'architect', 'tech lead'];
  return devKeywords.some((kw) => title.includes(kw));
}

module.exports = {
  TEAM_MEMBER_DEPARTMENTS,
  canViewOrgQueue,
  canAccessUserDirectory,
  isDeveloper,
  isHrAdmin,
  isOrgViewer,
  isQaManager,
  isTeamManager,
};
