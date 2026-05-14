import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { Plus, X, AlertTriangle, Zap } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
}

export default function Doctors() {
  const { profile } = useAuth();
  const { canAddDoctor, plan, refresh: refreshSub } = useSubscription();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('clinic_id', profile!.clinic_id)
      .order('name');
    if (error) {
      console.error('Erro ao buscar médicos:', error);
    } else if (data) {
      setDoctors(data as Doctor[]);
    }
  };

  useEffect(() => {
    if (profile?.clinic_id) {
      fetchDoctors();
    }
  }, [profile]);

  const openModal = () => {
    if (!canAddDoctor()) {
      setShowUpgradeModal(true);
      return;
    }
    setDoctorName('');
    setDoctorSpecialty('');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (modalLoading) return;
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const name = doctorName.trim();
    if (!name) {
      setModalError('Digite o nome do médico.');
      return;
    }
    if (!profile?.clinic_id) {
      setModalError('Usuário não vinculado a uma clínica.');
      return;
    }

    setModalLoading(true);
    const { error } = await supabase
      .from('doctors')
      .insert([{ name, specialty: doctorSpecialty.trim() || null, clinic_id: profile.clinic_id }]);
    setModalLoading(false);

    if (error) {
      setModalError(error.message || 'Erro ao criar médico.');
    } else {
      setShowModal(false);
      fetchDoctors();
      refreshSub();
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h1>Médicos Cadastrados</h1>
        <button onClick={openModal} className="btn-primary">
          <Plus size={18} /> Novo Médico
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Especialidade</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d.id}>
              <td><strong>{d.name}</strong></td>
              <td>{d.specialty || '-'}</td>
            </tr>
          ))}
          {doctors.length === 0 && (
            <tr><td colSpan={2} style={{textAlign: 'center', padding: '2rem'}}>Nenhum médico cadastrado.</td></tr>
          )}
        </tbody>
      </table>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Limite atingido</h2>
              <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="upgrade-modal-body">
              <AlertTriangle size={48} className="upgrade-icon" />
              <h3>Limite de médicos atingido</h3>
              <p>
                Seu plano <strong>{plan?.name || 'Starter'}</strong> permite até{' '}
                <strong>{plan?.max_doctors === -1 ? 'ilimitados' : plan?.max_doctors}</strong> médico(s).
                Faça upgrade para adicionar mais.
              </p>
              <div className="upgrade-modal-actions">
                <button className="btn-secondary" onClick={() => setShowUpgradeModal(false)}>Fechar</button>
                <Link to="/admin/billing" className="btn-primary" style={{ textDecoration: 'none' }}>
                  <Zap size={18} /> Ver Planos
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Médico</h2>
              <button className="modal-close" onClick={closeModal} disabled={modalLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="doctorName" className="form-label">Nome do Médico</label>
                <input
                  id="doctorName"
                  type="text"
                  className="form-control"
                  placeholder="Ex: Dr. Roberto Silva"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  autoFocus
                  disabled={modalLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="doctorSpecialty" className="form-label">Especialidade <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
                <input
                  id="doctorSpecialty"
                  type="text"
                  className="form-control"
                  placeholder="Ex: Oftalmologista Geral"
                  value={doctorSpecialty}
                  onChange={(e) => setDoctorSpecialty(e.target.value)}
                  disabled={modalLoading}
                />
              </div>
              {modalError && (
                <div className="auth-error" style={{ marginBottom: '1rem' }}>
                  <span>{modalError}</span>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={modalLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
