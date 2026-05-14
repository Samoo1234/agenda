import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, CalendarDays, ExternalLink, LogOut, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import './Admin.css';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clinic, signOut } = useAuth();
  const { isTrialing, isExpired, daysLeft, plan } = useSubscription();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Link público da clínica
  const publicLink = clinic?.slug ? `/${clinic.slug}` : '/';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <h2>{clinic?.name || 'Vision Care'}</h2>
          <span>Admin</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/admin" className={`nav-item ${isActive('/admin')}`}>
            <Calendar size={20} className="nav-icon" /> 
            <span>Agendamentos</span>
          </Link>
          <Link to="/admin/branches" className={`nav-item ${isActive('/admin/branches')}`}>
            <MapPin size={20} className="nav-icon" /> 
            <span>Filiais</span>
          </Link>
          <Link to="/admin/doctors" className={`nav-item ${isActive('/admin/doctors')}`}>
            <Users size={20} className="nav-icon" /> 
            <span>Médicos</span>
          </Link>
          <Link to="/admin/allocations" className={`nav-item ${isActive('/admin/allocations')}`}>
            <CalendarDays size={20} className="nav-icon" /> 
            <span>Escalas (Vagas)</span>
          </Link>
          <Link to="/admin/billing" className={`nav-item ${isActive('/admin/billing')}`}>
            <CreditCard size={20} className="nav-icon" /> 
            <span>Plano & Billing</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to={publicLink} className="nav-item back-link">
            <ExternalLink size={20} className="nav-icon" />
            <span>Ver Formulário</span>
          </Link>
          <button onClick={handleSignOut} className="nav-item logout-btn">
            <LogOut size={20} className="nav-icon" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      
      <main className="admin-main">
        {/* Trial Banner */}
        {isTrialing && (
          <div className="trial-banner">
            <div className="trial-banner-text">
              <Clock size={18} className="trial-icon" />
              <span>
                Seu teste grátis expira em <span className="trial-banner-days">{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</span>
                {plan && <> — Plano {plan.name}</>}
              </span>
            </div>
            <Link to="/admin/billing" className="trial-banner-btn">
              Fazer Upgrade
            </Link>
          </div>
        )}

        {isExpired && (
          <div className="trial-banner expired">
            <div className="trial-banner-text">
              <AlertTriangle size={18} className="trial-icon" />
              <span>
                Seu período de teste expirou. Faça upgrade para continuar usando o sistema.
              </span>
            </div>
            <Link to="/admin/billing" className="trial-banner-btn">
              Ver Planos
            </Link>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
