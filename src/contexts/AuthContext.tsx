import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  clinic_id: string;
  full_name: string;
  role: string;
}

interface Clinic {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  clinic: Clinic | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, clinicName: string, clinicSlug: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setClinic(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Buscar dados da clínica
      if (profileData?.clinic_id) {
        const { data: clinicData, error: clinicError } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', profileData.clinic_id)
          .single();

        if (clinicError) throw clinicError;
        setClinic(clinicData);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    clinicName: string,
    clinicSlug: string
  ) => {
    try {
      // Validação de slugs reservados (segunda camada de segurança)
      const reservedSlugs = [
        'login', 'register', 'admin', 'api', 'auth',
        'reset-password', 'update-password', 'dashboard',
        'settings', 'billing', 'pricing', 'terms', 'privacy',
        'support', 'help', 'about', 'contact'
      ];
      if (reservedSlugs.includes(clinicSlug)) {
        return { error: { message: 'Este nome de URL é reservado pelo sistema.' } };
      }

      // 1. Criar a clínica primeiro
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert([{ name: clinicName, slug: clinicSlug }])
        .select()
        .single();

      if (clinicError) {
        if (clinicError.message.includes('duplicate') || clinicError.code === '23505') {
          return { error: { message: 'Este slug já está em uso. Escolha outro nome para a URL.' } };
        }
        return { error: clinicError };
      }

      // 2. Criar o usuário com metadata que inclui o clinic_id
      // O trigger handle_new_user() vai criar o perfil automaticamente
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            clinic_id: clinicData.id,
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        // Se der erro no signup, deletar a clínica que foi criada
        await supabase.from('clinics').delete().eq('id', clinicData.id);
        return { error: signUpError };
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Erro inesperado ao criar conta.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setClinic(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, clinic, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
