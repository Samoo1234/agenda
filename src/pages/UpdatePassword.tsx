import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import './Auth.css';

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Escutar eventos de autenticação para detectar PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    // Também verificar se já existe uma sessão (o usuário pode ter chegado via redirect)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Se tem sessão, pode ser um recovery ou um acesso direto
        setIsRecovery(true);
      }
      setChecking(false);
    };

    // Dar um tempo para o onAuthStateChange processar o hash
    const timer = setTimeout(checkSession, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || 'Erro ao atualizar a senha. Tente novamente.');
    } else {
      setSuccess(true);
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/admin');
      }, 3000);
    }
  };

  // Loading state
  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="loading-screen" style={{ minHeight: 'auto', padding: '3rem 0' }}>
            <div className="loading-spinner" />
            <p>Verificando link de recuperação...</p>
          </div>
        </div>
      </div>
    );
  }

  // Se não é recovery e não tem sessão
  if (!isRecovery) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <Lock size={32} className="auth-logo-icon" />
            </div>
            <h1 className="auth-title">Link Inválido</h1>
            <p className="auth-subtitle">
              Este link de recuperação é inválido ou já expirou. Solicite um novo link na tela de login.
            </p>
          </div>
          <button
            className="auth-submit"
            onClick={() => navigate('/login')}
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Sucesso
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo success">
              <ShieldCheck size={32} className="auth-logo-icon" />
            </div>
            <h1 className="auth-title">Senha Atualizada!</h1>
            <p className="auth-subtitle">
              Sua senha foi alterada com sucesso. Você será redirecionado para o painel em instantes...
            </p>
          </div>
          <div className="auth-success">
            <p>Sua nova senha já está ativa. Use-a no próximo login.</p>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de nova senha
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} className="auth-logo-icon" />
          </div>
          <h1 className="auth-title">Nova Senha</h1>
          <p className="auth-subtitle">Defina uma nova senha para sua conta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">Nova Senha</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
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

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirmar Nova Senha</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="form-control"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <div className="btn-loading">
                <div className="loading-spinner small" />
                <span>Atualizando...</span>
              </div>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Atualizar Senha</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
