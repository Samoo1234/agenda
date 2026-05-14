import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function Login() {
  const { signIn, session, clinic } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para o fluxo de "Esqueceu a senha"
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Se já estiver logado e tivermos a clínica, redireciona para o formulário
  useEffect(() => {
    if (session && clinic) {
      navigate(`/${clinic.slug}`);
    }
  }, [session, clinic, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else {
      // Buscar o slug da clínica manualmente para garantir navegação imediata
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', userData.user.id).single();
        if (profile?.clinic_id) {
          const { data: clinicData } = await supabase.from('clinics').select('slug').eq('id', profile.clinic_id).single();
          if (clinicData?.slug) {
            navigate(`/${clinicData.slug}`);
            return;
          }
        }
      }
      navigate('/admin');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    if (!forgotEmail.trim()) {
      setForgotError('Digite seu e-mail.');
      setForgotLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setForgotLoading(false);

    if (error) {
      setForgotError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.');
    } else {
      setForgotSuccess(true);
    }
  };

  // Tela de "Esqueci minha senha"
  if (showForgot) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">
              <Mail size={32} className="auth-logo-icon" />
            </div>
            <h1 className="auth-title">Recuperar Senha</h1>
            <p className="auth-subtitle">
              {forgotSuccess
                ? 'E-mail enviado com sucesso!'
                : 'Digite seu e-mail para receber o link de recuperação'}
            </p>
          </div>

          {forgotSuccess ? (
            <div className="auth-success">
              <p>Enviamos um link de recuperação para <strong>{forgotEmail}</strong>.</p>
              <p>Verifique sua caixa de entrada e a pasta de spam.</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              {forgotError && (
                <div className="auth-error">
                  <span>{forgotError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="forgotEmail" className="form-label">E-mail cadastrado</label>
                <input
                  type="email"
                  id="forgotEmail"
                  className="form-control"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="auth-submit" disabled={forgotLoading}>
                {forgotLoading ? (
                  <div className="btn-loading">
                    <div className="loading-spinner small" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Enviar Link de Recuperação</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                setShowForgot(false);
                setForgotSuccess(false);
                setForgotError('');
                setForgotEmail('');
              }}
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Login padrão
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <Eye size={32} className="auth-logo-icon" />
          </div>
          <h1 className="auth-title">Vision Care</h1>
          <p className="auth-subtitle">Acesse o painel da sua clínica</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">Senha</label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  setShowForgot(true);
                  setForgotEmail(email); // Pre-preencher com o email já digitado
                }}
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <div className="btn-loading">
                <div className="loading-spinner small" />
                <span>Entrando...</span>
              </div>
            ) : (
              <>
                <LogIn size={18} />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Ainda não tem conta?{' '}
            <Link to="/register" className="auth-link">Cadastre sua clínica</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
