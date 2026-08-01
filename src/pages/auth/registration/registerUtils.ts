export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  countryCode: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues | 'form', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordLengthRange = { min: 12, max: 32 };

export const nameMaxLength = 150;
export const firstNameLengthRange = { min: 3, max: 30 };

export const phoneDigitLengthRange = { min: 7, max: 12 };

export const usernameLengthRange = { min: 3, max: 30 };
const usernamePattern = /^[a-zA-Z0-9._]+$/;

type RegisterErrorField = keyof RegisterFormValues | 'form';

const backendFieldMap: Record<string, RegisterErrorField> = {
  first_name: 'firstName',
  last_name: 'lastName',
  username: 'username',
  phone_number: 'phoneNumber',
  email: 'email',
  password: 'password',
  confirm_password: 'confirmPassword',
  non_field_errors: 'form',
  detail: 'form',
};

function collectErrorMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectErrorMessages);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectErrorMessages);
  }

  return [];
}

export function mapRegisterApiErrors(responseData: unknown): RegisterFormErrors {
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
    return {};
  }

  const errors: RegisterFormErrors = {};

  for (const [key, value] of Object.entries(responseData as Record<string, unknown>)) {
    const message = collectErrorMessages(value).join(' ');

    if (!message) {
      continue;
    }

    const field = backendFieldMap[key] ?? 'form';
    errors[field] = errors[field] ? `${errors[field]} ${message}` : message;
  }

  return errors;
}

export function normalizePhoneInput(value: string) {
  const cleaned = value.replace(/[^\d\s-]/g, '');

  // Cap the number of *digits* typed, while still allowing the
  // separator characters (spaces, dashes) the user has already typed.
  let digitCount = 0;
  let result = '';

  for (const char of cleaned) {
    if (/\d/.test(char)) {
      if (digitCount >= phoneDigitLengthRange.max) {
        continue;
      }
      digitCount += 1;
    }
    result += char;
  }

  return result;
}

export function normalizeUsernameInput(value: string) {
  // Strip anything that isn't a letter, number, dot, or underscore,
  // and cap length while typing so the field can never exceed the max.
  const cleaned = value.replace(/[^a-zA-Z0-9._]/g, '');
  return cleaned.slice(0, usernameLengthRange.max);
}

export function buildPhoneNumber(countryCode: string, phoneNumber: string) {
  const countryDigits = countryCode.replace(/\D/g, '');
  let digits = phoneNumber.replace(/\D/g, '');

  if (digits.startsWith(countryDigits)) {
    digits = digits.slice(countryDigits.length);
  }

  digits = digits.replace(/^0+/, '');

  return `${countryCode}${digits}`;
}

export function validateRegisterForm(values: RegisterFormValues) {
  const errors: RegisterFormErrors = {};

  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const username = values.username.trim();
  const email = values.email.trim().toLowerCase();
  const phoneDigits = values.phoneNumber.replace(/\D/g, '');
  const password = values.password;
  const confirmPassword = values.confirmPassword;

  if (!firstName) {
    errors.firstName = 'First name is required.';
  } else if (firstName.length < firstNameLengthRange.min || firstName.length > firstNameLengthRange.max) {
    errors.firstName = `First name must be ${firstNameLengthRange.min} to ${firstNameLengthRange.max} characters long.`;
  }

  if (!lastName) {
    errors.lastName = 'Last name is required.';
  } else if (lastName.length > nameMaxLength) {
    errors.lastName = `Last name must be ${nameMaxLength} characters or fewer.`;
  }

  if (!username) {
    errors.username = 'Username is required.';
  } else if (username.length < usernameLengthRange.min || username.length > usernameLengthRange.max) {
    errors.username = `Username must be ${usernameLengthRange.min} to ${usernameLengthRange.max} characters long.`;
  } else if (!usernamePattern.test(username)) {
    errors.username = 'Username can only contain letters, numbers, dots, and underscores.';
  } else if (firstName && username.toLowerCase() === firstName.toLowerCase()) {
    errors.username = 'Username cannot be the same as your first name.';
  } else if (lastName && username.toLowerCase() === lastName.toLowerCase()) {
    errors.username = 'Username cannot be the same as your last name.';
  }

  if (!phoneDigits) {
    errors.phoneNumber = 'Phone number is required.';
  } else if (!/^\d+$/.test(phoneDigits)) {
    errors.phoneNumber = 'Phone number can contain digits only.';
  } else if (phoneDigits.length < phoneDigitLengthRange.min || phoneDigits.length > phoneDigitLengthRange.max) {
    errors.phoneNumber = `Phone number must be ${phoneDigitLengthRange.min} to ${phoneDigitLengthRange.max} digits long.`;
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (email.length > 254) {
    errors.email = 'Email address is too long.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < passwordLengthRange.min) {
    errors.password = `Password must be at least ${passwordLengthRange.min} characters.`;
  } else if (password.length > passwordLengthRange.max) {
    errors.password = `Password must be ${passwordLengthRange.max} characters or fewer.`;
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must include at least one lowercase letter.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must include at least one uppercase letter.';
  } else if (!/\d/.test(password)) {
    errors.password = 'Password must include at least one number.';
  } else if (!/[^\w\s]/.test(password)) {
    errors.password = 'Password must include at least one special character.';
  } else {
    const lowerPassword = password.toLowerCase();
    const phoneDigitsOnly = values.phoneNumber.replace(/\D/g, '');

    if (firstName && firstName.length >= 3 && lowerPassword.includes(firstName.toLowerCase())) {
      errors.password = 'Password cannot contain your first name.';
    } else if (lastName && lastName.length >= 3 && lowerPassword.includes(lastName.toLowerCase())) {
      errors.password = 'Password cannot contain your last name.';
    } else if (username && username.length >= 3 && lowerPassword.includes(username.toLowerCase())) {
      errors.password = 'Password cannot contain your username.';
    } else if (phoneDigitsOnly && phoneDigitsOnly.length >= 4 && password.includes(phoneDigitsOnly)) {
      errors.password = 'Password cannot contain your phone number.';
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.termsAccepted) {
    errors.termsAccepted = 'You must agree to the terms to continue.';
  }

  return errors;
}