import { useState, useCallback } from 'react';
import { ZxcvbnFactory, type OptionsType } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

export interface PasswordValidationResult {
  status: 'idle' | 'invalid-char' | 'too-short' | 'weak' | 'medium' | 'strong';
  message: string;
  score: number;
  disabled: boolean;
}

const ASCII_ONLY = /^[\x20-\x7E]*$/;

const INITIAL: PasswordValidationResult = {
  status: 'idle',
  message: '',
  score: 0,
  disabled: false,
};

const zxcvbnOptionsConfig: OptionsType = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
};

// Built once per app load, not per keystroke — constructing this pulls in
// the full dictionary/graph data, so it's expensive to redo on every call.
const zxcvbnChecker = new ZxcvbnFactory(zxcvbnOptionsConfig);

// Mirrors the checklist shown under the password field: 12+ characters,
// at least one uppercase letter, one lowercase letter, one digit, and one
// special character. When a password satisfies every one of these, we
// treat it as "strong" outright rather than deferring to zxcvbn's raw
// entropy score — otherwise a password that visibly passes every rule in
// the checklist could still be graded "medium", which reads as a
// contradiction to the user.
function meetsAllFormatRequirements(value: string) {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^\w\s]/.test(value)
  );
}

export function usePasswordValidation() {
  const [validation, setValidation] = useState<PasswordValidationResult>(INITIAL);

  const validatePassword = useCallback(async (value: string) => {
    if (!value) {
      setValidation(INITIAL);
      return;
    }

    // 1. Regex filter – no emojis / non-ASCII
    if (!ASCII_ONLY.test(value)) {
      setValidation({
        status: 'invalid-char',
        message: 'Invalid character. Only letters, numbers, and symbols allowed.',
        score: 0,
        disabled: true,
      });
      return;
    }

    // 2. Length check
    if (value.length < 12) {
      setValidation({
        status: 'too-short',
        message: 'Too Short (Must be 12+ characters)',
        score: 0,
        disabled: true,
      });
      return;
    }

    // 3. Strength meter (zxcvbn), with a format-requirement override so a
    // password that visibly satisfies every rule in the checklist is
    // never shown as anything less than "Strong".
    try {
      const result = zxcvbnChecker.check(value);
      const formatOverride = meetsAllFormatRequirements(value);
      const score = formatOverride ? Math.max(result.score, 3) : result.score;

      if (score <= 1) {
        setValidation({
          status: 'weak',
          message: 'Weak',
          score,
          disabled: true,
        });
      } else if (score === 2) {
        setValidation({
          status: 'medium',
          message: 'Medium',
          score,
          disabled: false,
        });
      } else {
        setValidation({
          status: 'strong',
          message: 'Strong',
          score,
          disabled: false,
        });
      }
    } catch {
      // Fail closed: if the checker genuinely throws, don't silently
      // allow submission.
      setValidation({
        status: 'weak',
        message: 'Could not verify password strength. Please try again.',
        score: 0,
        disabled: true,
      });
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidation(INITIAL);
  }, []);

  return { validation, validatePassword, resetValidation };
}