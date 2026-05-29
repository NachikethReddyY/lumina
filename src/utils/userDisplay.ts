import type { ApiUser } from './apiClient';

/** Onboarding department bucket for HR/admin filters and charts. */
export type DepartmentGroup = 'manager' | 'developer' | 'qa';

export type DepartmentGroupFilter = 'all' | DepartmentGroup;

const DEPARTMENT_GROUP_LABELS: Record<DepartmentGroup, string> = {
  manager: 'Manager',
  developer: 'Developer',
  qa: 'QA',
};

export const DEPARTMENT_GROUP_FILTERS: DepartmentGroupFilter[] = ['all', 'manager', 'developer', 'qa'];

export function getDepartmentGroupLabel(filter: DepartmentGroupFilter): string {
  if (filter === 'all') return 'All Roles';
  return DEPARTMENT_GROUP_LABELS[filter];
}

/** Maps onboarding `department` to Manager / Developer / QA filter groups. */
export function getUserDepartmentGroup(user: ApiUser | null | undefined): DepartmentGroup | null {
  switch (user?.department?.trim()) {
    case 'Managers':
    case 'HR':
      return 'manager';
    case 'Developers':
      return 'developer';
    case 'QA':
      return 'qa';
    default:
      return null;
  }
}

export function matchesDepartmentGroupFilter(
  user: ApiUser,
  filter: DepartmentGroupFilter
): boolean {
  if (filter === 'all') return true;
  return getUserDepartmentGroup(user) === filter;
}

/** Specific onboarding role (e.g. "Software Engineer / Developer") — not system user/admin. */
export function getUserRoleLabel(user: ApiUser | null | undefined): string {
  return user?.job_title?.trim() ?? '';
}

/** `email · Software Engineer / Developer` or email only when role not set yet. */
export function formatUserEmailAndRole(user: ApiUser | null | undefined): string {
  if (!user) return '';
  const role = getUserRoleLabel(user);
  return role ? `${user.email} · ${role}` : user.email;
}
