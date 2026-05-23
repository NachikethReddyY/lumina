/** Placeholder names before the user enters their real name (email signup / OAuth). */
function isPlaceholderName(firstName, lastName) {
  const f = String(firstName ?? '').trim().toLowerCase();
  const l = String(lastName ?? '').trim().toLowerCase();
  return (
    (l === 'user' && (f === 'new' || f === 'google')) ||
    (l === 'new' && f === 'user')
  );
}

/**
 * True when the user must visit /complete-profile and submit their name.
 * name_set is only TRUE after the user explicitly saves on that page.
 */
function needsProfileName(user) {
  if (!user) return true;
  if (!user.name_set) return true;
  if (isPlaceholderName(user.first_name, user.last_name)) return true;
  return false;
}

/** Attach needs_profile_name and optional OAuth flags for consistent client routing. */
function serializeUser(user, options = {}) {
  if (!user) return user;
  const isGoogle = Boolean(options.is_google_account);
  return {
    ...user,
    is_google_account: isGoogle,
    needs_profile_name: needsProfileName(user),
  };
}

module.exports = { isPlaceholderName, needsProfileName, serializeUser };
