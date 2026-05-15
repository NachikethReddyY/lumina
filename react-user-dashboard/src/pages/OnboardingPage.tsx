import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../utils/apiClient';
import './OnboardingPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Customer Success',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Other',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refetch } = useCurrentUser();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !department) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setStatus('loading');
    try {
      let avatarUrl = user?.avatar_url;

      // Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await usersApi.uploadAvatar(formData);
        const avatarData = (await avatarRes.json().catch(() => ({}))) as { avatarUrl?: string };
        if (!avatarRes.ok) {
          setStatus('error');
          showToast('Failed to upload avatar', 'error');
          return;
        }
        avatarUrl = avatarData.avatarUrl;
      }

      // Save onboarding info
      const res = await usersApi.saveOnboarding(jobTitle, department);
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!res.ok) {
        setStatus('error');
        showToast(data.error || 'Failed to save onboarding info', 'error');
        return;
      }

      setStatus('success');
      await refetch();
      showToast(data.message || 'Profile updated successfully', 'success');
      navigate('/pending-approval');
    } catch {
      setStatus('error');
      showToast('Network error. Please try again.', 'error');
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="onboarding-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="onboarding-logo" variants={itemVariants}>
            <Logo size="md" showText={true} vertical={true} />
          </motion.div>

          <motion.div className="onboarding-header" variants={itemVariants}>
            <h1 className="onboarding-title">Let's get to know you</h1>
            <p className="onboarding-subtitle">
              Tell us a bit about yourself so we can personalize your experience
            </p>
          </motion.div>

          {user && (
            <motion.div className="onboarding-user-info" variants={itemVariants}>
              <div className="onboarding-avatar-section">
                <div className="onboarding-avatar-container">
                  {avatarPreview || user.avatar_url ? (
                    <>
                      <img
                        src={avatarPreview || user.avatar_url}
                        alt={user.first_name}
                        className="onboarding-avatar"
                      />
                      {avatarFile && (
                        <button
                          type="button"
                          className="onboarding-avatar-remove"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="onboarding-avatar-placeholder">
                      <Upload size={32} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="onboarding-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === 'loading'}
                >
                  {avatarFile ? 'Change Photo' : 'Upload Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div>
                <p className="onboarding-user-name">
                  {user.first_name} {user.last_name}
                </p>
                <p className="onboarding-user-email">{user.email}</p>
              </div>
            </motion.div>
          )}

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="jobTitle">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                placeholder="e.g. Senior Engineer, Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={status === 'loading'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={status === 'loading'}
              >
                <option value="">Select a department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={status === 'loading'}
              disabled={!jobTitle.trim() || !department || status === 'loading'}
            >
              Continue to Approval
            </Button>
          </form>

          <motion.div className="onboarding-footer" variants={itemVariants}>
            <p className="onboarding-step-counter">Step 2 of 3</p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default OnboardingPage;
