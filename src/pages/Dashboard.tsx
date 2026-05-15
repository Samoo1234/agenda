import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Edit2, X, CircleDollarSign, Check, Trash2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const { profile } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);

  // Modal de Edição
  const [showModal, setShowModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  
  const [editStatus, setEditStatus] = useState('');
  const [editAllocationId, setEditAllocationId] = useState('');
  const [editTime, setEditTime] = useState('');
  
  const [allocations, setAllocations] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (profile?.clinic_id) {
      fetchAppointments();
    }
  }, [profile]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        allocations (
          id,
          date,
          branch_id,
          clinic_id,
          branches (name),
          doctors (name)
        )
      `)
      .eq('allocations.clinic_id', profile!.clinic_id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const filtered = data.filter(appt => appt.allocations !== null);
      setAppointments(filtered);
    }
  };

  const fetchAllocationsForEdit = async (appt: any) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Buscar escalas futuras
    const { data: futureData } = await supabase.from('allocations').select(`
      id, date, start_time_morning, end_time_morning, start_time_afternoon, end_time_afternoon, interval_minutes,
      branches (name),
      doctors (name)
    `)
    .eq('clinic_id', profile!.clinic_id)
    .gte('date', todayStr)
    .order('date');

    let allAllocations = futureData || [];

    // Se a consulta a ser editada for de uma data passada, adicionar à lista para não quebrar o select
    if (appt && !allAllocations.find(a => a.id === appt.allocation_id)) {
      const { data: pastData } = await supabase.from('allocations').select(`
        id, date, start_time_morning, end_time_morning, start_time_afternoon, end_time_afternoon, interval_minutes,
        branches (name),
        doctors (name)
      `).eq('id', appt.allocation_id);
      
      if (pastData && pastData.length > 0) {
        allAllocations = [...pastData, ...allAllocations];
      }
    }
    
    setAllocations(allAllocations);
  };

  const openEditModal = async (appt: any) => {
    setSelectedAppt(appt);
    setEditStatus(appt.status);
    setEditAllocationId(appt.allocation_id);
    setEditTime(appt.time);
    
    await fetchAllocationsForEdit(appt);
    setShowModal(true);
  };

  const closeModal = () => {
    if (!modalLoading) setShowModal(false);
  };

  useEffect(() => {
    if (editAllocationId && selectedAppt && allocations.length > 0) {
      generateSlots(editAllocationId, selectedAppt.id, selectedAppt.time);
    } else {
      setAvailableSlots([]);
    }
  }, [editAllocationId, selectedAppt, allocations]);

  const generateSlots = async (allocationId: string, currentApptId: string, originalTime: string) => {
    const allocation = allocations.find(a => a.id === allocationId);
    if (!allocation) return;

    const slots: string[] = [];
    
    const populateSlots = (start: string, end: string) => {
      if (!start || !end) return;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      for (let m = startMinutes; m < endMinutes; m += allocation.interval_minutes) {
        const h = String(Math.floor(m / 60)).padStart(2, '0');
        const min = String(m % 60).padStart(2, '0');
        slots.push(`${h}:${min}`);
      }
    };

    if (allocation.start_time_morning && allocation.end_time_morning) {
      populateSlots(allocation.start_time_morning, allocation.end_time_morning);
    }
    if (allocation.start_time_afternoon && allocation.end_time_afternoon) {
      populateSlots(allocation.start_time_afternoon, allocation.end_time_afternoon);
    }

    // Buscar quem já agendou nesse horário
    const { data: booked } = await supabase
      .from('appointments')
      .select('id, time')
      .eq('allocation_id', allocationId);

    // Ignorar a consulta que estamos editando para podermos manter o mesmo horário
    const bookedTimes = new Set(booked?.filter(a => a.id !== currentApptId).map(a => a.time) ?? []);
    const freeSlots = slots.filter(s => !bookedTimes.has(s));

    setAvailableSlots(freeSlots);
    
    // Se o horário selecionado não estiver livre (e não for o original que ele já possui na mesma escala), limpar
    if (!freeSlots.includes(editTime)) {
      if (allocationId === selectedAppt.allocation_id) {
         setEditTime(originalTime);
      } else {
         setEditTime('');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTime || !editAllocationId || !editStatus) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    setModalLoading(true);
    const { error } = await supabase
      .from('appointments')
      .update({
        status: editStatus,
        allocation_id: editAllocationId,
        time: editTime
      })
      .eq('id', selectedAppt.id);
      
    setModalLoading(false);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
    } else {
      setShowModal(false);
      fetchAppointments(); // Recarregar tabela
    }
  };

  const handleQuickStatus = async (apptId: string, newStatus: string) => {
    if (newStatus === 'cancelado' && !window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', apptId);
      
    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } else {
      fetchAppointments();
    }
  };

  const goToFinancial = (appt: any) => {
    const date = appt.allocations?.date;
    const branchId = appt.allocations?.branch_id;
    if (date && branchId) {
      navigate(`/admin/financial?date=${date}&branch=${branchId}`);
    } else {
      navigate(`/admin/financial`);
    }
  };

  const [filterDate, setFilterDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.clinic_id) {
      fetchAvailableDates();
    }
  }, [profile?.clinic_id, filterBranch]);

  const fetchAvailableDates = async () => {
    const { data } = await supabase
      .from('allocations')
      .select('date, branches(name)')
      .eq('clinic_id', profile!.clinic_id)
      .order('date', { ascending: false });
    
    if (data) {
      let filtered = data;
      if (filterBranch) {
        filtered = data.filter((d: any) => d.branches?.name === filterBranch);
      }
      const unique = Array.from(new Set(filtered.map(d => d.date)));
      setAvailableDates(unique);
    }
  };

  const uniqueBranches = Array.from(new Set(appointments.map(a => a.allocations?.branches?.name).filter(Boolean))) as string[];

  const filteredAppointments = appointments.filter(appt => {
    let match = true;
    if (filterBranch && appt.allocations?.branches?.name !== filterBranch) match = false;
    if (filterDate && appt.allocations?.date !== filterDate) match = false;
    return match;
  });

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h1>Agendamentos</h1>
      </div>
      
      <div className="filters-section" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtrar por Filial</label>
          <select 
            className="form-control" 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">Todas as filiais</option>
            {uniqueBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtrar por Data</label>
          <select 
            className="form-control" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="">Todas as datas</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>
        {(filterBranch || filterDate) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              className="btn-secondary" 
              onClick={() => { setFilterBranch(''); setFilterDate(''); }}
              style={{ height: '42px' }}
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Contato</th>
              <th>Filial</th>
              <th>Médico</th>
              <th>Data/Hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.length > 0 ? filteredAppointments.map((appt) => (
              <tr key={appt.id}>
                <td><strong>{appt.patient_name}</strong></td>
                <td>{appt.patient_phone}</td>
                <td>{appt.allocations?.branches?.name || 'N/A'}</td>
                <td>{appt.allocations?.doctors?.name || 'N/A'}</td>
                <td>{appt.allocations?.date ? formatDate(appt.allocations.date) : ''} às {appt.time}</td>
                <td>
                  <span className={`status-badge status-${appt.status}`}>
                    {appt.status.toUpperCase()}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => goToFinancial(appt)} 
                    className="action-btn-quick financial"
                    title="Financeiro"
                  >
                    <CircleDollarSign size={20} />
                  </button>
                  <button 
                    onClick={() => handleQuickStatus(appt.id, 'confirmado')} 
                    className="action-btn-quick confirm"
                    title="Confirmar Presença"
                    disabled={appt.status === 'confirmado'}
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => openEditModal(appt)} 
                    className="action-btn-quick reschedule"
                    title="Reagendar"
                  >
                    <Clock size={20} />
                  </button>
                  <button 
                    onClick={() => handleQuickStatus(appt.id, 'cancelado')} 
                    className="action-btn-quick cancel"
                    title="Cancelar"
                    disabled={appt.status === 'cancelado'}
                  >
                    <X size={20} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Clock size={32} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                  <p>{appointments.length === 0 ? 'Nenhum agendamento encontrado no sistema.' : 'Nenhum agendamento encontrado para os filtros selecionados.'}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedAppt && (
        <div 
          className="modal-overlay" 
          onClick={closeModal}
          style={{ alignItems: 'flex-start', paddingTop: '5vh' }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh', overflowY: 'auto', maxWidth: '540px', margin: '0 auto' }}
          >
            <div className="modal-header">
              <h2>Editar Agendamento</h2>
              <button className="modal-close" onClick={closeModal} disabled={modalLoading}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdate}>
              
              <div className="auth-info-box" style={{ marginBottom: '1rem' }}>
                <p><strong>Paciente:</strong> {selectedAppt.patient_name}</p>
                <p><strong>Contato:</strong> {selectedAppt.patient_phone}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Status da Consulta</label>
                <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} disabled={modalLoading}>
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Escala (Data / Filial / Médico)</label>
                <select 
                  className="form-control" 
                  value={editAllocationId} 
                  onChange={(e) => setEditAllocationId(e.target.value)} 
                  required 
                  disabled={modalLoading}
                >
                  <option value="" disabled>Selecione a escala</option>
                  {allocations.map(a => (
                    <option key={a.id} value={a.id}>
                      {formatDate(a.date)} - {a.branches?.name} (com {a.doctors?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Novo Horário</label>
                <select 
                  className="form-control" 
                  value={editTime} 
                  onChange={(e) => setEditTime(e.target.value)} 
                  required 
                  disabled={modalLoading || availableSlots.length === 0}
                >
                  <option value="" disabled>
                    {availableSlots.length === 0 ? 'Sem horários disponíveis' : 'Selecione um horário'}
                  </option>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={modalLoading}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading || !editTime}>
                  {modalLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
