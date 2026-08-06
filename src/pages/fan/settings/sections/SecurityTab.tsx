import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { changePassword } from '../../../../services/accountService';

const passwordLengthRange = { min: 12, max: 32 };

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Enter your current password.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Enter a new password.';
  } else if (values.newPassword.length < passwordLengthRange.min || values.newPassword.length > passwordLengthRange.max) {
    errors.newPassword = `Password must be ${passwordLengthRange.min} to ${passwordLengthRange.max} characters.`;
  } else if (!/[a-z]/.test(values.newPassword) || !/[A-Z]/.test(values.newPassword) || !/\d/.test(values.newPassword)) {
    errors.newPassword = 'Password must include upper, lower case letters and a number.';
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = 'New password must be different from your current password.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function SecurityTab() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const isDirty = values.currentPassword || values.newPassword || values.confirmPassword;

  const updateField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleCancel = () => {
    setValues(EMPTY_VALUES);
    setErrors({});
    setBanner(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setBanner(null);

    try {
      await changePassword(values.currentPassword, values.newPassword);
      setValues(EMPTY_VALUES);
      setBanner({ tone: 'success', message: 'Your password has been changed.' });
    } catch {
      setBanner({ tone: 'error', message: 'Could not change your password. Check your current password and try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-panel-heading">Security</h2>
      <p className="settings-panel-subtext">Change your password to keep your account secure.</p>

      {banner && (
        <div className={`settings-banner settings-banner--${banner.tone}`} role="status">
          {banner.tone === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {banner.message}
        </div>
      )}

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className={errors.currentPassword ? 'has-error' : undefined}>
          Current password
          <input
            type="password"
            value={values.currentPassword}
            onChange={(event) => updateField('currentPassword', event.target.value)}
            autoComplete="current-password"
          />
          {errors.currentPassword && <span className="settings-field-error">{errors.currentPassword}</span>}
        </label>

        <label className={errors.newPassword ? 'has-error' : undefined}>
          New password
          <input
            type="password"
            value={values.newPassword}
            onChange={(event) => updateField('newPassword', event.target.value)}
            autoComplete="new-password"
          />
          {errors.newPassword && <span className="settings-field-error">{errors.newPassword}</span>}
        </label>

        <label className={errors.confirmPassword ? 'has-error' : undefined}>
          Confirm new password
          <input
            type="password"
            value={values.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span className="settings-field-error">{errors.confirmPassword}</span>}
        </label>

        <div className="settings-form-actions">
          <button type="button" className="settings-btn settings-btn--ghost" onClick={handleCancel} disabled={!isDirty || isSaving}>
            Cancel
          </button>
          <button type="submit" className="settings-btn settings-btn--primary" disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SecurityTab;
