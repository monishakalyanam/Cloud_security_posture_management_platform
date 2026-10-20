import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If a token is saved from an earlier visit, ask the server who it belongs to before showing pages.
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('cspm:unauthorized', onUnauthorized);
    return () => window.removeEventListener('cspm:unauthorized', onUnauthorized);
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    tokenStore.set(data.token);
    setUser(data.user);
  };

  const register = async (form) => {
    const data = await api.register(form);
    tokenStore.set(data.token);
    setUser(data.user);
  };

  // JWTs are stateless: logging out means the browser forgets the token.
  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
