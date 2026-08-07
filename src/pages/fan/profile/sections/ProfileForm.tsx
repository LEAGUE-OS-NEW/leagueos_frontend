import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FiAlertCircle, FiCamera, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { removeAvatar, updateProfile, uploadAvatar } from '../../../../services/authServices';
import type { BackendProfile } from '../../../../data/currentUser';
import AvatarCropModal from './AvatarCropModal';
import './ProfileForm.css';

const PROFILE_UPDATED_EVENT = 'leagueos:profile-updated';

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  favoriteSport: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
};

type FormErrors = Partial<Record<keyof FormValues | 'form', string>>;

const nameLengthRange = { min: 2, max: 50 };
const bioMaxLength = 240;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toFormValues(profile?: BackendProfile | null): FormValues {
  return {
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    email: profile?.email ?? '',
    phoneNumber: profile?.phone_number ?? '',
    location: profile?.location ?? '',
    favoriteSport: profile?.favourite_sport ?? profile?.favorite_sport ?? '',
    bio: profile?.bio ?? '',
    gender: profile?.gender ?? '',
    dateOfBirth: profile?.date_of_birth ?? '',
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const email = values.email.trim();

  if (!firstName) {
    errors.firstName = 'First name is required.';
  } else if (firstName.length < nameLengthRange.min || firstName.length > nameLengthRange.max) {
    errors.firstName = `First name must be ${nameLengthRange.min} to ${nameLengthRange.max} characters.`;
  }

  if (!lastName) {
    errors.lastName = 'Last name is required.';
  } else if (lastName.length < nameLengthRange.min || lastName.length > nameLengthRange.max) {
    errors.lastName = `Last name must be ${nameLengthRange.min} to ${nameLengthRange.max} characters.`;
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (values.bio.length > bioMaxLength) {
    errors.bio = `Bio must be ${bioMaxLength} characters or fewer.`;
  }

  return errors;
}

function dispatchProfileUpdated() {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

function ProfileForm({ profile, isLoading }: { profile: BackendProfile | null; isLoading: boolean }) {
  const initialValues = toFormValues(profile);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? profile?.avatar ?? null);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSyncedRealProfile = useRef(false);

  // The profile arrives asynchronously (useCurrentUser starts with `null`),
  // so re-sync the form once real data lands — but only that first time, so
  // we don't clobber edits in progress on later profile-updated refreshes.
  useEffect(() => {
    if (profile && !hasSyncedRealProfile.current) {
      hasSyncedRealProfile.current = true;
      const nextValues = toFormValues(profile);
      setValues(nextValues);
      setSavedValues(nextValues);
      setAvatarPreview(profile.avatar_url ?? profile.avatar ?? null);
    }
  }, [profile]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(savedValues);
  const initials = (values.firstName[0] ?? '') + (values.lastName[0] ?? '') || 'F';

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setBanner(null);

    try {
      await updateProfile({
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        email: values.email.trim(),
        phone_number: values.phoneNumber.trim(),
        location: values.location.trim(),
        favourite_sport: values.favoriteSport.trim(),
        bio: values.bio.trim(),
        gender: values.gender,
        date_of_birth: values.dateOfBirth,
      });
      setSavedValues(values);
      setBanner({ tone: 'success', message: 'Your profile has been updated.' });
      dispatchProfileUpdated();
    } catch {
      setBanner({ tone: 'error', message: 'Could not save your profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValues(savedValues);
    setErrors({});
    setBanner(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingCropSrc(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleCropCancel = () => {
    if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc(null);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc(null);
    setIsAvatarBusy(true);
    setBanner(null);

    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await uploadAvatar(file);
      setAvatarPreview(URL.createObjectURL(blob));
      setBanner({ tone: 'success', message: 'Your photo has been updated.' });
      dispatchProfileUpdated();
    } catch {
      setBanner({ tone: 'error', message: 'Could not upload your photo. Please try again.' });
    } finally {
      setIsAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsAvatarBusy(true);
    setBanner(null);

    try {
      await removeAvatar();
      setAvatarPreview(null);
      setBanner({ tone: 'success', message: 'Your photo has been removed.' });
      dispatchProfileUpdated();
    } catch {
      setBanner({ tone: 'error', message: 'Could not remove your photo. Please try again.' });
    } finally {
      setIsAvatarBusy(false);
    }
  };

  return (
    <div className="profile-panel">
      {banner && (
        <div className={`profile-banner profile-banner--${banner.tone}`} role="status">
          {banner.tone === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {banner.message}
        </div>
      )}

      <div className="profile-avatar-row">
        <div className="profile-avatar">
          {avatarPreview ? <img src={avatarPreview} alt="Your avatar" /> : <span>{initials.toUpperCase()}</span>}
        </div>

        <div className="profile-avatar-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-avatar-input"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="profile-btn profile-btn--outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAvatarBusy}
          >
            <FiCamera /> Change photo
          </button>
          {avatarPreview && (
            <button
              type="button"
              className="profile-btn profile-btn--ghost"
              onClick={handleRemoveAvatar}
              disabled={isAvatarBusy}
            >
              <FiTrash2 /> Remove
            </button>
          )}
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-field-grid">
          <label className={errors.firstName ? 'has-error' : undefined}>
            First name
            <input
              type="text"
              value={values.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              disabled={isLoading}
            />
            {errors.firstName && <span className="profile-field-error">{errors.firstName}</span>}
          </label>

          <label className={errors.lastName ? 'has-error' : undefined}>
            Last name
            <input
              type="text"
              value={values.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              disabled={isLoading}
            />
            {errors.lastName && <span className="profile-field-error">{errors.lastName}</span>}
          </label>

          <label className={errors.email ? 'has-error' : undefined}>
            Email address
            <input
              type="email"
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
              disabled={isLoading}
            />
            {errors.email && <span className="profile-field-error">{errors.email}</span>}
          </label>

          <label>
            Phone number
            <input
              type="tel"
              value={values.phoneNumber}
              onChange={(event) => updateField('phoneNumber', event.target.value)}
              disabled={isLoading}
            />
          </label>

          <label>
            Location
            <input
              type="text"
              value={values.location}
              onChange={(event) => updateField('location', event.target.value)}
              disabled={isLoading}
              placeholder="City, Country"
            />
          </label>

          <label>
            Favorite sport
            <select
              value={values.favoriteSport}
              onChange={(event) => updateField('favoriteSport', event.target.value)}
              disabled={isLoading}
            >
              <option value="">Select a sport</option>
              <option value="Football">Football</option>
              <option value="Rugby">Rugby</option>
              <option value="Basketball">Basketball</option>
            </select>
          </label>

          <label>
            Gender
            <select value={values.gender} onChange={(event) => updateField('gender', event.target.value)} disabled={isLoading}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Date of birth
            <input
              type="date"
              value={values.dateOfBirth}
              onChange={(event) => updateField('dateOfBirth', event.target.value)}
              disabled={isLoading}
            />
          </label>
        </div>

        <label className={`profile-bio-field${errors.bio ? ' has-error' : ''}`}>
          Bio
          <textarea
            value={values.bio}
            onChange={(event) => updateField('bio', event.target.value)}
            rows={3}
            maxLength={bioMaxLength}
            disabled={isLoading}
            placeholder="Tell other fans a little about yourself"
          />
          <span className="profile-bio-count">
            {values.bio.length}/{bioMaxLength}
          </span>
          {errors.bio && <span className="profile-field-error">{errors.bio}</span>}
        </label>

        <div className="profile-form-actions">
          <button type="button" className="profile-btn profile-btn--ghost" onClick={handleCancel} disabled={!isDirty || isSaving}>
            Cancel
          </button>
          <button type="submit" className="profile-btn profile-btn--primary" disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {pendingCropSrc && (
        <AvatarCropModal imageSrc={pendingCropSrc} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}

export default ProfileForm;
