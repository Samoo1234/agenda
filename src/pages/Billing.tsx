import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { Check, Crown, Zap, Clock, AlertTriangle, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import './Billing.css';
import './Admin.css';

const WHATSAPP = '5566984048957';
const EMAIL = 'suporte@samtecsolucoes.com.br';

export default function Billing() {
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const {
    plan,
    clinic, // Adicionando clinic aqui também que faltava
    allPlans,
    subscriptionStatus,
    daysLeft,
    isTrialing,
    isExpired,
    isActive,
    loading,
    currentBranches,
    currentDoctors,
  } = useSubscription();

  if (loading) {
    return (
      <div className="dashboard-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" />
        <p>Carregando plano...</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (isExpired) return <span className="plan-badge expired"><AlertTriangle size={14} /> Expirado</span>;
    if (isTrialing) return <span className="plan-badge trialing"><Clock size={14} /> Trial — {daysLeft} dias restantes</span>;
    if (isActive) return <span className="plan-badge active"><Check size={14} /> Ativo</span>;
    return <span className="plan-badge trialing">{subscriptionStatus}</span>;
  };

  const getUsagePercent = (current: number, max: number) => {
    if (max === -1) return 5; // ilimitado, mostra mínimo
    if (max === 0) return 100;
    return Math.min(100, (current / max) * 100);
  };

  const getBarClass = (percent: number) => {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return '';
  };

  const formatLimit = (max: number) => {
    return max === -1 ? '∞' : String(max);
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return null;
    return `R$ ${(cents / 100).toFixed(0)}`;
  };

  const handleUpgrade = async (planId: string, stripePriceId?: string) => {
    if (!stripePriceId) {
      // Fallback para WhatsApp se não houver ID do Stripe configurado
      const message = encodeURIComponent(
        `Olá! Gostaria de fazer upgrade para o plano ${planId.charAt(0).toUpperCase() + planId.slice(1)} do Vision Care.`
      );
      window.open(`https://wa.me/${WHATSAPP}?text=${message}`, '_blank');
      return;
    }

    try {
      setUpgradingId(planId);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: stripePriceId,
          clinicId: clinic?.id,
          returnUrl: window.location.origin + '/admin/billing'
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erro ao iniciar checkout:', err);
      alert('Não foi possível iniciar o pagamento. Tente novamente ou contate o suporte.');
    } finally {
      setUpgradingId(null);
    }
  };

  const branchPercent = getUsagePercent(currentBranches, plan?.max_branches ?? 1);
  const doctorPercent = getUsagePercent(currentDoctors, plan?.max_doctors ?? 2);

  return (
    <div className="billing-page">
      <h1>Plano & Faturamento</h1>
      <p className="billing-subtitle">Gerencie seu plano e acompanhe seu uso</p>

      {/* Current Plan */}
      <div className="current-plan-card">
        <div className="current-plan-header">
          <div className="current-plan-info">
            <h2>Plano {plan?.name || 'Starter'}</h2>
            {getStatusBadge()}
          </div>
        </div>

        <div className="usage-section">
          <div className="usage-item">
            <div className="usage-item-header">
              <span>Filiais</span>
              <span>{currentBranches} / {formatLimit(plan?.max_branches ?? 1)}</span>
            </div>
            <div className="usage-bar">
              <div
                className={`usage-bar-fill ${getBarClass(branchPercent)}`}
                style={{ width: `${branchPercent}%` }}
              />
            </div>
          </div>

          <div className="usage-item">
            <div className="usage-item-header">
              <span>Médicos</span>
              <span>{currentDoctors} / {formatLimit(plan?.max_doctors ?? 2)}</span>
            </div>
            <div className="usage-bar">
              <div
                className={`usage-bar-fill ${getBarClass(doctorPercent)}`}
                style={{ width: `${doctorPercent}%` }}
              />
            </div>
          </div>

          <div className="usage-item">
            <div className="usage-item-header">
              <span>Agendamentos/mês</span>
              <span>{formatLimit(plan?.max_appointments_month ?? 50)}</span>
            </div>
            <div className="usage-bar">
              <div className="usage-bar-fill" style={{ width: '5%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <h2 className="plans-section-title">Escolha seu plano</h2>
      <p className="plans-section-subtitle">Upgrade a qualquer momento. Cancele quando quiser.</p>

      <div className="plans-grid">
        {allPlans.map((p) => {
          const isCurrent = p.id === plan?.id;
          const isFeatured = p.id === 'pro';
          const price = formatPrice(p.price_monthly);
          const isUpgrading = upgradingId === p.id;

          return (
            <div key={p.id} className={`plan-card ${isFeatured ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}>
              {isFeatured && <div className="featured-badge">Popular</div>}
              {isCurrent && <div className="current-badge">Atual</div>}

              <h3 className="plan-card-name">
                {p.id === 'enterprise' && <Crown size={18} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />}
                {p.name}
              </h3>

              <div className="plan-card-price">
                {price ? (
                  <>
                    <span className="price-value">{price}</span>
                    <span className="price-period">/mês</span>
                  </>
                ) : (
                  <span className="price-free">Grátis por 15 dias</span>
                )}
              </div>

              <ul className="plan-card-features">
                {p.features.map((feature: string, i: number) => (
                  <li key={i}>
                    <Check size={16} className="feature-check" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="plan-card-btn current-plan-btn" disabled>
                  <Check size={18} /> Plano atual
                </button>
              ) : p.price_monthly > (plan?.price_monthly ?? 0) ? (
                <button
                  className={`plan-card-btn ${isFeatured ? 'primary' : 'outlined'} ${isUpgrading ? 'loading' : ''}`}
                  onClick={() => handleUpgrade(p.id, p.stripe_price_id)}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <>
                      <Zap size={18} /> Fazer upgrade
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button className="plan-card-btn outlined" disabled>
                  Downgrade
                </button>
              )}
            </div>
          );
        })}
      </div>


      {/* Contact */}
      <div className="billing-contact">
        <h3>Precisa de ajuda com seu plano?</h3>
        <p>Entre em contato com nossa equipe para tirar dúvidas ou personalizar seu plano.</p>
        <div className="contact-buttons">
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de ajuda com meu plano no Vision Care.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn whatsapp"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
          <a
            href={`mailto:${EMAIL}?subject=Suporte Vision Care — Plano`}
            className="contact-btn email"
          >
            <Mail size={18} /> E-mail
          </a>
        </div>
      </div>
    </div>
  );
}
