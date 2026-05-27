/** Individual-contributor departments whose ticket progress managers track. */
const TEAM_MEMBER_DEPARTMENTS = ['Developers', 'QA'];

function isTeamManager(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'Managers';
}

function isQaManager(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'QA';
}

/** HR admins see organization-wide tickets, people analytics, routing logs, and user directory. */
function isHrAdmin(user = {}) {
  return user.role === 'admin' && String(user.department || '').trim() === 'HR';
}

function isOrgViewer(user = {}) {
  return isHrAdmin(user) || isTeamManager(user) || isQaManager(user);
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
  isDeveloper,
  isHrAdmin,
  isOrgViewer,
  isQaManager,
  isTeamManager,
};
