import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import './Auth.css';

// Slugs que não podem ser usados por clínicas (rotas do sistema)
const RESERVED_SLUGS = [
  'login', 'register', 'admin', 'api', 'auth',
  'reset-password', 'update-password', 'dashboard',
  'settings', 'billing', 'pricing', 'terms', 'privacy',
  'support', 'help', 'about', 'contact'
];

export default function Register() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicSlug, setClinicSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Gerar slug automaticamente com base no nome da clínica
  const handleClinicNameChange = (value: string) => {
    setClinicName(value);
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
      .replace(/\s+/g, '-') // troca espaços por hífens
      .replace(/-+/g, '-') // remove hífens duplicados
      .trim();
    setClinicSlug(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (!clinicSlug) {
      setError('O slug da clínica não pode ficar vazio.');
      setLoading(false);
      return;
    }

    if (RESERVED_SLUGS.includes(clinicSlug)) {
      setError('Este nome de URL é reservado pelo sistema. Escolha outro nome para a URL da clínica.');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, clinicName, clinicSlug);

    if (error) {
      setError(error.message || 'Erro ao criar conta. Tente novamente.');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo success">
              <UserPlus size={32} className="auth-logo-icon" />
            </div>
            <h1 className="auth-title">Conta Criada!</h1>
            <p className="auth-subtitle">
              Verifique seu e-mail para confirmar a conta. Após confirmar, faça login para acessar o painel administrativo.
            </p>
          </div>

          <div className="auth-info-box">
            <p><strong>Clínica:</strong> {clinicName}</p>
            <p><strong>Link público:</strong> seusite.com/<strong>{clinicSlug}</strong></p>
          </div>

          <Link to="/login" className="auth-submit" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <UserPlus size={32} className="auth-logo-icon" />
          </div>
          <h1 className="auth-title">Cadastre sua Clínica</h1>
          <p className="auth-subtitle">Comece a gerenciar seus agendamentos agora</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Seu Nome Completo</label>
            <input
              type="text"
              id="fullName"
              className="form-control"
              placeholder="João da Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="clinicName" className="form-label">Nome da Clínica</label>
            <input
              type="text"
              id="clinicName"
              className="form-control"
              placeholder="Clínica Visão Perfeita"
              value={clinicName}
              onChange={(e) => handleClinicNameChange(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="clinicSlug" className="form-label">
              URL da Clínica
            </label>
            <div className="slug-preview">
              <span className="slug-prefix">seusite.com/</span>
              <input
                type="text"
                id="clinicSlug"
                className="form-control slug-input"
                placeholder="clinica-visao"
                value={clinicSlug}
                onChange={(e) => setClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
            </div>
          </div>

          <hr className="auth-divider" />

          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail de Acesso</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                <span>Criando conta...</span>
              </div>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Criar Conta</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="auth-link">Faça Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
