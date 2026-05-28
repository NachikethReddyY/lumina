import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  CheckCircle2,
  User,
  ClipboardList,
  Monitor,
  Search,
  type LucideIcon,
} from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { SetupLoading } from '../components/SetupLoading';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/useToast';
import { usersApi, type ApiUser } from '../utils/apiClient';
import { apiAssetUrl } from '../utils/apiBase';
import { getSetupStepNumber, needsProfileName } from '../utils/authFlow';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from '../utils/onboardingDraft';
import './OnboardingPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Category = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

const CATEGORIES: Category[] = [
  { id: 'HR', label: 'HR', Icon: User },
  { id: 'Managers', label: 'Managers', Icon: ClipboardList },
  { id: 'Developers', label: 'Developers', Icon: Monitor },
  { id: 'QA', label: 'QA', Icon: Search },
];

const ROLE_OPTIONS: Record<string, string[]> = {
  HR: ['HR'],
  Managers: ['Product Manager', 'Project Manager', 'QA Manager'],
  Developers: ['Software Engineer', 'Tech Lead', 'Architect', 'Platform Engineer', 'DevOps / Site Reliability Engineer'],
  QA: ['QA Engineer', 'Automation Engineer'],
};

async function cropImageToBlob(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;

  // Create circular clipping path
  ctx.beginPath();
  ctx.arc(crop.width / 2, crop.height / 2, crop.width / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas empty'));
    }, 'image/jpeg', 0.95);
  });
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, refetch, setUser } = useCurrentUser();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [rawImage, setRawImage] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({ unit: 'px', width: 200, height: 200, x: 0, y: 0 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [restored, setRestored] = useState(false);

  // Hardwired: never show onboarding until name step is complete
  useEffect(() => {
    if (!user || loading) return;
    if (needsProfileName(user)) {
      navigate('/complete-profile', { replace: true });
    }
  }, [user, loading, navigate]);

  // Restore role selections from local draft or partial server data
  useEffect(() => {
    if (!user) return;
    const draft = loadOnboardingDraft(user.id);
    const category =
      draft.category ??
      (user.department && CATEGORIES.some((c) => c.id === user.department) ? user.department : null);
    const roleOptions = category ? ROLE_OPTIONS[category] ?? [] : [];
    const role =
      draft.subtitle ??
      (roleOptions.includes(user.job_title || '') ? user.job_title : null) ??
      (roleOptions.length === 1 ? roleOptions[0] : null);
    if (category) setSelectedCategory(category);
    if (role) setSelectedRole(role);
    setRestored(true);
  }, [user]);

  useEffect(() => {
    if (!user || !restored) return;
    saveOnboardingDraft(user.id, {
      category: selectedCategory,
      subtitle: selectedRole,
    });
  }, [user, selectedCategory, selectedRole, restored]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const minDim = Math.min(width, height);
    const startX = (width - minDim) / 2;
    const startY = (height - minDim) / 2;

    setCrop({
      unit: 'px',
      width: minDim * 0.8,
      height: minDim * 0.8,
      x: startX + (minDim * 0.1),
      y: startY + (minDim * 0.1),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImage(event.target?.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!cropImgRef.current) {
      showToast('Image not loaded. Please try again.', 'error');
      return;
    }

    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
      showToast('Please adjust the crop area first', 'error');
      return;
    }

    try {
      const blob = await cropImageToBlob(cropImgRef.current, completedCrop);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        setShowCropModal(false);
        setRawImage('');
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Failed to crop image. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      showToast('Please select your role category', 'error');
      return;
    }
    if (!selectedRole) {
      showToast('Please select your role', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setStatus('loading');
    try {
      // Upload avatar if provided (server updates profile; URL not needed for onboarding payload)
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await usersApi.uploadAvatar(formData);
        if (!avatarRes.ok) {
          await avatarRes.json().catch(() => ({}));
          setStatus('error');
          setShowConfirmation(false);
          showToast('Failed to upload avatar', 'error');
          return;
        }
      }

      // Save onboarding info — selected role becomes job title and team becomes department.
      const res = await usersApi.saveOnboarding(selectedRole!, selectedCategory!);
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        user?: ApiUser;
      };

      if (!res.ok) {
        setStatus('error');
        setShowConfirmation(false);
        showToast(data.error || 'Failed to save onboarding info', 'error');
        return;
      }

      const nextUser = data.user ?? (await refetch());
      if (nextUser) {
        setUser(nextUser);
        clearOnboardingDraft(nextUser.id);
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setShowConfirmation(false);
      showToast('Network error. Please try again.', 'error');
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  if (loading || !user) {
    return <SetupLoading message="Loading profile setup…" />;
  }

  const step = getSetupStepNumber(user);

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
            <h1 className="onboarding-title">Complete your profile</h1>
            <p className="onboarding-subtitle">
              Help us personalize your experience with a bit more about you
            </p>
          </motion.div>

          <motion.div className="onboarding-user-section" variants={itemVariants}>
              {/* Avatar Section */}
              <div className="onboarding-avatar-wrapper">
                <div className="onboarding-avatar-container">
                  {avatarPreview || user.avatar_url ? (
                    <img
                      key={avatarPreview || user.avatar_url}
                      src={avatarPreview || apiAssetUrl(user.avatar_url)}
                      alt={user.first_name}
                      className="onboarding-avatar"
                    />
                  ) : (
                    <div className="onboarding-avatar-placeholder">
                      <span className="avatar-initials">{user.first_name[0]}{user.last_name[0]}</span>
                    </div>
                  )}
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
                </div>
                <button
                  type="button"
                  className="onboarding-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === 'loading'}
                >
                  <Upload size={16} />
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

              {/* User Info Section */}
              <div className="onboarding-user-info">
                <div className="onboarding-name-section">
                  <h2 className="onboarding-user-name">
                    {user.first_name} {user.last_name}
                  </h2>
                  {user.email_is_verified && (
                    <div className="onboarding-verified-badge">
                      <CheckCircle2 size={16} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <p className="onboarding-user-email">{user.email}</p>

                {/* Role Selection */}
                <div className="role-category-select">
                  <label>Your Team</label>
                  <p className="onboarding-field-desc">Choose the team that best matches your work</p>
                  <div className="category-cards">
                    {CATEGORIES.filter((cat) => cat.id !== 'HR' || user.email === 'ynrdevs@gmail.com').map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-card ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedRole(null);
                        }}
                      >
                        <span className="category-icon" aria-hidden>
                          <cat.Icon size={24} />
                        </span>
                        <span className="category-label">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {selectedCategory && (
                    <motion.div
                      className="subtitle-chips"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="onboarding-field-desc" style={{ marginBottom: 8 }}>Choose your role</div>
                      {ROLE_OPTIONS[selectedCategory]?.map((role) => (
                        <button
                          key={role}
                          type="button"
                          className={`subtitle-chip ${selectedRole === role ? 'active' : ''}`}
                          onClick={() => setSelectedRole(role)}
                        >
                          {role}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

          </motion.div>

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <Button
              type="submit"
              size="lg"
              loading={status === 'loading'}
              disabled={!selectedCategory || !selectedRole || status === 'loading'}
              className="w-full onboarding-submit-btn"
            >
              Continue to Approval
            </Button>
          </form>

          <motion.div className="onboarding-footer" variants={itemVariants}>
            <p className="onboarding-step-counter">Step {step} of 3</p>
          </motion.div>
        </motion.div>
      </Container>

      {/* Crop Modal */}
      {showCropModal && (
        <motion.div
          className="crop-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="crop-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="crop-modal-header">
              <h3>Crop your photo</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawImage('');
                }}
                className="crop-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={cropImgRef}
                  src={rawImage}
                  alt="Crop"
                  className="crop-image"
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>

            <div className="crop-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawImage('');
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                className="btn-confirm"
              >
                Apply Crop
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <motion.div
          className="crop-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="crop-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="crop-modal-header">
              <h3>Submit Application</h3>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="crop-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="confirmation-content">
              <p className="confirmation-message">
                Are you sure you want to submit your application? Once submitted, it will be reviewed by an administrator.
              </p>
            </div>

            <div className="crop-modal-actions">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="btn-cancel"
                disabled={status === 'loading'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn-confirm"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default OnboardingPage;
