import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  Calendar,
  Building2,
  Globe,
  Zap,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Settings,
  Send,
  Check,
  ArrowRight,
  Star,
  Clock,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import './LandingPage.css';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Intersection Observer for scroll animations
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* ========== NAVBAR ========== */}
      <nav className="landing-nav">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <div className="nav-logo-icon">
              <Eye size={22} />
            </div>
            <span className="nav-logo-text">Vision Care</span>
          </Link>

          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <button type="button" onClick={() => scrollTo('features')} className="nav-link">
              Funcionalidades
            </button>
            <button type="button" onClick={() => scrollTo('how-it-works')} className="nav-link">
              Como Funciona
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="nav-link">
              Preços
            </button>
            <div className="nav-actions-mobile">
              <Link to="/login" className="nav-link">Entrar</Link>
              <Link to="/register" className="nav-btn-cta">Comece Grátis</Link>
            </div>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="nav-link nav-login">Entrar</Link>
            <Link to="/register" className="nav-btn-cta">
              Comece Grátis
              <ArrowRight size={16} />
            </Link>
          </div>

          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-badge animate-on-scroll">
            <Star size={14} />
            <span>Plataforma #1 de Agendamento para Clínicas</span>
          </div>

          <h1 className="hero-title animate-on-scroll">
            Gerencie agendamentos da sua clínica com{' '}
            <span className="hero-gradient-text">inteligência</span>
          </h1>

          <p className="hero-subtitle animate-on-scroll">
            Plataforma completa para clínicas oftalmológicas: escalas médicas,
            agendamento público por link e painel administrativo em tempo real.
            Tudo em um só lugar.
          </p>

          <div className="hero-actions animate-on-scroll">
            <Link to="/register" className="hero-btn-primary">
              <Zap size={20} />
              Teste Grátis por 15 dias
            </Link>
            <button
              type="button"
              className="hero-btn-secondary"
              onClick={() => scrollTo('how-it-works')}
            >
              Como Funciona
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="hero-stats animate-on-scroll">
            <div className="hero-stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Clínicas ativas</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">50k+</span>
              <span className="stat-label">Agendamentos/mês</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">Funcionalidades</span>
            <h2 className="section-title">Tudo que sua clínica precisa</h2>
            <p className="section-subtitle">
              Ferramentas profissionais para gerenciar agendamentos, médicos e filiais
              com total segurança e praticidade.
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <Calendar size={28} />,
                title: 'Agendamento Inteligente',
                desc: 'Pacientes agendam online pelo link exclusivo da sua clínica, sem precisar de login.',
              },
              {
                icon: <Building2 size={28} />,
                title: 'Multi-Filial',
                desc: 'Gerencie múltiplas filiais com escalas independentes em um único painel.',
              },
              {
                icon: <Globe size={28} />,
                title: 'Link Público Exclusivo',
                desc: 'Cada clínica tem sua URL única (ex: seusite.com/clinica-visao) para compartilhar.',
              },
              {
                icon: <Zap size={28} />,
                title: 'Tempo Real',
                desc: 'Horários atualizados instantaneamente. Sem conflitos ou agendamentos duplicados.',
              },
              {
                icon: <ShieldCheck size={28} />,
                title: 'Segurança Total',
                desc: 'Dados isolados por clínica com criptografia e Row Level Security.',
              },
              {
                icon: <Smartphone size={28} />,
                title: 'Mobile First',
                desc: 'Interface responsiva que funciona perfeitamente em qualquer dispositivo.',
              },
            ].map((feature, i) => (
              <div key={i} className="feature-card animate-on-scroll" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="how-section">
        <div className="section-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">Como Funciona</span>
            <h2 className="section-title">Comece em 3 passos simples</h2>
            <p className="section-subtitle">
              Da criação da conta ao primeiro agendamento em menos de 5 minutos.
            </p>
          </div>

          <div className="steps-grid">
            {[
              {
                step: '01',
                icon: <UserPlus size={32} />,
                title: 'Cadastre sua Clínica',
                desc: 'Crie sua conta gratuitamente. Defina o nome e o link exclusivo da sua clínica.',
              },
              {
                step: '02',
                icon: <Settings size={32} />,
                title: 'Configure as Escalas',
                desc: 'Adicione filiais, médicos e horários de atendimento. Monte a escala em minutos.',
              },
              {
                step: '03',
                icon: <Send size={32} />,
                title: 'Compartilhe o Link',
                desc: 'Envie o link para seus pacientes. Eles agendam online, sem precisar ligar.',
              },
            ].map((step, i) => (
              <div key={i} className="step-card animate-on-scroll" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < 2 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">Planos</span>
            <h2 className="section-title">Escolha o plano ideal</h2>
            <p className="section-subtitle">
              Comece com o teste gratuito de 15 dias. Sem compromisso, sem cartão de crédito.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Starter / Trial */}
            <div className="pricing-card animate-on-scroll">
              <div className="pricing-header">
                <div className="pricing-badge-trial">
                  <Clock size={14} />
                  15 dias grátis
                </div>
                <h3 className="pricing-plan-name">Starter</h3>
                <p className="pricing-plan-desc">Ideal para conhecer a plataforma</p>
              </div>
              <div className="pricing-price">
                <span className="pricing-currency">R$</span>
                <span className="pricing-amount">0</span>
                <span className="pricing-period">/15 dias</span>
              </div>
              <ul className="pricing-features">
                <li><Check size={16} /> <span>1 filial</span></li>
                <li><Check size={16} /> <span>2 médicos</span></li>
                <li><Check size={16} /> <span>50 agendamentos</span></li>
                <li><Check size={16} /> <span>Link público exclusivo</span></li>
                <li><Check size={16} /> <span>Painel administrativo</span></li>
              </ul>
              <Link to="/register" className="pricing-btn pricing-btn-outline">
                Começar Agora
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pro (Highlighted) */}
            <div className="pricing-card pricing-card-featured animate-on-scroll" style={{ animationDelay: '0.1s' }}>
              <div className="pricing-popular-badge">
                <Star size={12} />
                Mais Popular
              </div>
              <div className="pricing-header">
                <h3 className="pricing-plan-name">Pro</h3>
                <p className="pricing-plan-desc">Para clínicas em crescimento</p>
              </div>
              <div className="pricing-price">
                <span className="pricing-currency">R$</span>
                <span className="pricing-amount">97</span>
                <span className="pricing-period">/mês</span>
              </div>
              <ul className="pricing-features">
                <li><Check size={16} /> <span>Até 5 filiais</span></li>
                <li><Check size={16} /> <span>Médicos ilimitados</span></li>
                <li><Check size={16} /> <span>Agendamentos ilimitados</span></li>
                <li><Check size={16} /> <span>Link público exclusivo</span></li>
                <li><Check size={16} /> <span>Painel administrativo</span></li>
                <li><Check size={16} /> <span>Suporte por e-mail</span></li>
              </ul>
              <Link to="/register" className="pricing-btn pricing-btn-primary">
                Comece Grátis por 15 dias
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Enterprise */}
            <div className="pricing-card animate-on-scroll" style={{ animationDelay: '0.2s' }}>
              <div className="pricing-header">
                <h3 className="pricing-plan-name">Enterprise</h3>
                <p className="pricing-plan-desc">Para redes e grandes clínicas</p>
              </div>
              <div className="pricing-price">
                <span className="pricing-currency">R$</span>
                <span className="pricing-amount">197</span>
                <span className="pricing-period">/mês</span>
              </div>
              <ul className="pricing-features">
                <li><Check size={16} /> <span>Filiais ilimitadas</span></li>
                <li><Check size={16} /> <span>Médicos ilimitados</span></li>
                <li><Check size={16} /> <span>Agendamentos ilimitados</span></li>
                <li><Check size={16} /> <span>Link público exclusivo</span></li>
                <li><Check size={16} /> <span>Painel administrativo</span></li>
                <li><Check size={16} /> <span>Suporte prioritário</span></li>
                <li><Check size={16} /> <span>Personalização de marca</span></li>
              </ul>
              <Link to="/register" className="pricing-btn pricing-btn-outline">
                Comece Grátis por 15 dias
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA FINAL ========== */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content animate-on-scroll">
            <h2 className="cta-title">
              Pronto para transformar o agendamento da sua clínica?
            </h2>
            <p className="cta-subtitle">
              Junte-se a centenas de clínicas que já modernizaram seus agendamentos.
              Teste grátis por 15 dias, sem compromisso.
            </p>
            <Link to="/register" className="hero-btn-primary">
              <Zap size={20} />
              Começar Agora — É Grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="nav-brand" style={{ textDecoration: 'none' }}>
              <div className="nav-logo-icon">
                <Eye size={20} />
              </div>
              <span className="nav-logo-text">Vision Care</span>
            </div>
            <p className="footer-tagline">
              Agendamento inteligente para clínicas oftalmológicas.
            </p>
          </div>

          <div className="footer-links-group">
            <h4>Produto</h4>
            <button type="button" onClick={() => scrollTo('features')}>Funcionalidades</button>
            <button type="button" onClick={() => scrollTo('pricing')}>Preços</button>
            <button type="button" onClick={() => scrollTo('how-it-works')}>Como Funciona</button>
          </div>

          <div className="footer-links-group">
            <h4>Conta</h4>
            <Link to="/login">Entrar</Link>
            <Link to="/register">Criar Conta</Link>
          </div>

          <div className="footer-links-group">
            <h4>Legal</h4>
            <a href="#">Termos de Uso</a>
            <a href="#">Política de Privacidade</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Vision Care. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
