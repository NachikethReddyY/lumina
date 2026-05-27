-- Seed pending approval test accounts.
-- These users will appear in the HR admin approval queue.
INSERT INTO users (
  email, password_hash, first_name, last_name, role, status, email_is_verified,
  onboarding_completed, name_set, job_title, department
)
SELECT
  lower(seed.email),
  crypt(seed.password, gen_salt('bf')),
  seed.first_name,
  seed.last_name,
  seed.role::user_role,
  seed.status::user_status,
  seed.email_is_verified,
  seed.onboarding_completed,
  seed.name_set,
  seed.job_title,
  seed.department
FROM (
  VALUES
    ('pending.alice@lumina.test', 'Testpass1', 'Alice', 'Thompson', 'user', 'pending', FALSE, FALSE, FALSE, 'Software Engineer', 'Developers'),
    ('pending.bob@lumina.test', 'Testpass1', 'Bob', 'Martinez', 'user', 'pending', FALSE, FALSE, FALSE, 'QA Engineer', 'QA'),
    ('pending.carol@lumina.test', 'Testpass1', 'Carol', 'Williams', 'user', 'pending', FALSE, FALSE, FALSE, 'Product Manager', 'Managers'),
    ('pending.dan@lumina.test', 'Testpass1', 'Dan', 'Garcia', 'user', 'pending', FALSE, FALSE, FALSE, 'Software Engineer', 'Developers')
) AS seed(email, password, first_name, last_name, role, status, email_is_verified, onboarding_completed, name_set, job_title, department)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    email_is_verified = EXCLUDED.email_is_verified,
    onboarding_completed = EXCLUDED.onboarding_completed,
    name_set = EXCLUDED.name_set,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department;
