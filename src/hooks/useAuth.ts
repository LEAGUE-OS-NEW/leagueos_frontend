import { useAuthStore } from '../store/authStore.ts';
import * as authApi from '../services/authServices.ts';
import type {
  AuthenticationResponse,
  LoginPayload,
} from '../services/authServices.ts';

export function useAuth() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const completeAuthentication = (result: AuthenticationResponse) => {
    const { user, access, refresh, requires_email_verification } = result;

    setAuth({
      user,
      access,
      refresh,
      requiresEmailVerification: Boolean(requires_email_verification),
    });

    return result;
  };

   const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    console.log('USEAUTH DEBUG: response =', response); // TEMP
    return completeAuthentication(response.data);
};

  const logout = () => {
    clearAuth();
  };

   return { login, logout };
}
