import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard } from 'lucide-react';
import SchedulingForm from '../components/SchedulingForm';

interface Clinic {
  id: string;
  name: string;
  slug: string;
}

export default function ClientHome() {
  const { slug } = useParams<{ slug: string }>();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { session, profile } = useAuth();

  useEffect(() => {
    if (slug) {
      fetchClinic(slug);
    }
  }, [slug]);

  const fetchClinic = async (clinicSlug: string) => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('slug', clinicSlug)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setClinic(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen" style={{ minHeight: 'auto' }}>
          <div className="loading-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="app-container">
        <header className="brand-header">
          <h1 className="brand-title" style={{ fontSize: '1.8rem' }}>Clínica não encontrada</h1>
          <p className="brand-subtitle">
            O link que você acessou não corresponde a nenhuma clínica cadastrada.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Botão de acesso ao painel para o admin da clínica */}
      {session && profile && profile.clinic_id === clinic?.id && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
          <Link 
            to="/admin" 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 500, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            <LayoutDashboard size={18} />
            Painel Admin
          </Link>
        </div>
      )}

      <header className="brand-header" style={{ paddingTop: session ? '3rem' : '2rem' }}>
        <h1 className="brand-title">{clinic!.name}</h1>
        <p className="brand-subtitle">Agende sua consulta oftalmológica com especialistas</p>
      </header>
      <main>
        <SchedulingForm clinicId={clinic!.id} />
      </main>
    </div>
  );
}
