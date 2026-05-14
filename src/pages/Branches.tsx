import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { Plus, X, AlertTriangle, Zap } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

export default function Branches() {
  const { profile } = useAuth();
  const { canAddBranch, plan, refresh: refreshSub } = useSubscription();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('clinic_id', profile!.clinic_id)
      .order('name');
    if (error) {
      console.error('Erro ao buscar filiais:', error);
    } else if (data) {
      setBranches(data as Branch[]);
    }
  };

  useEffect(() => {
    if (profile?.clinic_id) {
      fetchBranches();
    }
  }, [profile]);

  const openModal = () => {
    if (!canAddBranch()) {
      setShowUpgradeModal(true);
      return;
    }
    setBranchName('');
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

    const name = branchName.trim();
    if (!name) {
      setModalError('Digite o nome da filial.');
      return;
    }
    if (!profile?.clinic_id) {
      setModalError('Usuário não vinculado a uma clínica.');
      return;
    }

    setModalLoading(true);
    const { error } = await supabase
      .from('branches')
      .insert([{ name, clinic_id: profile.clinic_id }]);
    setModalLoading(false);

    if (error) {
      setModalError(error.message || 'Erro ao criar filial.');
    } else {
      setShowModal(false);
      fetchBranches();
      refreshSub();
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h1>Filiais Cadastradas</h1>
        <button onClick={openModal} className="btn-primary">
          <Plus size={18} /> Nova Filial
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Nome da Filial</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td><strong>{b.name}</strong></td>
            </tr>
          ))}
          {branches.length === 0 && (
            <tr><td style={{textAlign: 'center', padding: '2rem'}}>Nenhuma filial cadastrada.</td></tr>
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
              <h3>Limite de filiais atingido</h3>
              <p>
                Seu plano <strong>{plan?.name || 'Starter'}</strong> permite até{' '}
                <strong>{plan?.max_branches === -1 ? 'ilimitadas' : plan?.max_branches}</strong> filial(is).
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
              <h2>Nova Filial</h2>
              <button className="modal-close" onClick={closeModal} disabled={modalLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="branchName" className="form-label">Nome da Filial</label>
                <input
                  id="branchName"
                  type="text"
                  className="form-control"
                  placeholder="Ex: Filial São Paulo"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  autoFocus
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
