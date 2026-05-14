import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

interface Branch { id: string; name: string; }
interface Doctor { id: string; name: string; specialty: string | null; }
interface Allocation {
  id: string;
  date: string;
  start_time_morning: string;
  end_time_morning: string;
  start_time_afternoon: string | null;
  end_time_afternoon: string | null;
  interval_minutes: number;
  branches: { name: string; id: string };
  doctors: { name: string; id: string };
}

export default function Allocations() {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const { profile } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Estados do formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [startTimeMorning, setStartTimeMorning] = useState('08:00');
  const [endTimeMorning, setEndTimeMorning] = useState('12:00');
  const [startTimeAfternoon, setStartTimeAfternoon] = useState('');
  const [endTimeAfternoon, setEndTimeAfternoon] = useState('');
  const [interval, setInterval] = useState('30');

  const fetchOptions = async () => {
    const { data: bData } = await supabase.from('branches').select('*').eq('clinic_id', profile!.clinic_id).order('name');
    const { data: dData } = await supabase.from('doctors').select('*').eq('clinic_id', profile!.clinic_id).order('name');
    if (bData) setBranches(bData as Branch[]);
    if (dData) setDoctors(dData as Doctor[]);
  };

  const fetchAllocations = async () => {
    const { data, error } = await supabase.from('allocations').select(`
      id, date, start_time_morning, end_time_morning, start_time_afternoon, end_time_afternoon, interval_minutes,
      branches (id, name),
      doctors (id, name)
    `)
    .eq('clinic_id', profile!.clinic_id)
    .order('date', { ascending: false });
    
    if (error) console.error(error);
    if (data) setAllocations((data as unknown) as Allocation[]);
  };

  useEffect(() => {
    if (profile?.clinic_id) {
      fetchAllocations();
      fetchOptions();
    }
  }, [profile]);

  const openModal = () => {
    setEditingId(null);
    setDate(''); 
    setBranchId(''); 
    setDoctorId('');
    setStartTimeMorning('08:00'); 
    setEndTimeMorning('12:00');
    setStartTimeAfternoon(''); 
    setEndTimeAfternoon('');
    setInterval('30');
    setModalError(''); 
    setShowModal(true);
  };

  const openEditModal = (a: Allocation) => {
    setEditingId(a.id);
    setDate(a.date);
    setBranchId(a.branches.id);
    setDoctorId(a.doctors.id);
    setStartTimeMorning(a.start_time_morning);
    setEndTimeMorning(a.end_time_morning);
    setStartTimeAfternoon(a.start_time_afternoon || '');
    setEndTimeAfternoon(a.end_time_afternoon || '');
    setInterval(String(a.interval_minutes));
    setModalError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("ATENÇÃO: Excluir esta escala também vai cancelar e apagar todos os agendamentos de pacientes que já foram feitos para este dia/horário.\n\nTem certeza que deseja excluir?");
    if (!confirm) return;

    const { error } = await supabase.from('allocations').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir escala: ' + error.message);
    } else {
      fetchAllocations();
    }
  };

  const closeModal = () => { if (!modalLoading) setShowModal(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!date || !branchId || !doctorId || !startTimeMorning || !endTimeMorning) {
      setModalError('Preencha os dados obrigatórios e o turno da manhã.'); return;
    }
    if (startTimeMorning >= endTimeMorning) {
      setModalError('Na manhã, o início deve ser anterior ao fim.'); return;
    }
    if (startTimeAfternoon || endTimeAfternoon) {
      if (!startTimeAfternoon || !endTimeAfternoon) {
         setModalError('Preencha os dois horários da tarde ou deixe ambos em branco.'); return;
      }
      if (startTimeAfternoon >= endTimeAfternoon) {
         setModalError('Na tarde, o início deve ser anterior ao fim.'); return;
      }
      if (endTimeMorning >= startTimeAfternoon) {
         setModalError('O turno da tarde deve começar após o fim do turno da manhã.'); return;
      }
    }
    
    if (!profile?.clinic_id) {
      setModalError('Usuário não vinculado a uma clínica.'); return;
    }
    setModalLoading(true);

    const allocationData = {
      clinic_id: profile.clinic_id, 
      branch_id: branchId, 
      doctor_id: doctorId,
      date, 
      start_time_morning: startTimeMorning, 
      end_time_morning: endTimeMorning, 
      start_time_afternoon: startTimeAfternoon || null,
      end_time_afternoon: endTimeAfternoon || null,
      interval_minutes: Number(interval)
    };

    let error;

    if (editingId) {
      // Atualizar
      const { error: updateError } = await supabase
        .from('allocations')
        .update(allocationData)
        .eq('id', editingId);
      error = updateError;
    } else {
      // Inserir novo
      const { error: insertError } = await supabase
        .from('allocations')
        .insert([allocationData]);
      error = insertError;
    }

    setModalLoading(false);
    
    if (error) {
      setModalError(error.message || 'Erro ao salvar escala.');
    } else { 
      setShowModal(false); 
      fetchAllocations(); 
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h1>Escala de Atendimento</h1>
        <button onClick={openModal} className="btn-primary">
          <Plus size={18} /> Nova Escala
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Filial</th>
            <th>Médico</th>
            <th>Horário (Manhã)</th>
            <th>Horário (Tarde)</th>
            <th>Intervalo</th>
            <th style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a) => (
             <tr key={a.id}>
              <td><strong>{formatDate(a.date)}</strong></td>
              <td>{a.branches?.name}</td>
              <td>{a.doctors?.name}</td>
              <td>{a.start_time_morning} - {a.end_time_morning}</td>
              <td>{a.start_time_afternoon ? `${a.start_time_afternoon} - ${a.end_time_afternoon}` : '-'}</td>
              <td>{a.interval_minutes} min</td>
              <td style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => openEditModal(a)} 
                  className="action-btn"
                  title="Editar Escala"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', marginRight: '1rem' }}
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(a.id)} 
                  className="action-btn"
                  title="Excluir Escala"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
          {allocations.length === 0 && (
            <tr><td colSpan={7} style={{textAlign: 'center', padding: '2rem'}}>Nenhuma escala definida.</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
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
              <h2>{editingId ? 'Editar Escala' : 'Nova Escala'}</h2>
              <button className="modal-close" onClick={closeModal} disabled={modalLoading}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required disabled={modalLoading}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Filial</label>
                  {branches.length === 0 ? (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem 0' }}>
                      Nenhuma filial.
                    </div>
                  ) : (
                    <select className="form-control" value={branchId} onChange={(e) => setBranchId(e.target.value)} required disabled={modalLoading}>
                      <option value="" disabled>Selecione</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className="form-group">
                  <label className="form-label">Médico</label>
                  {doctors.length === 0 ? (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem 0' }}>
                      Nenhum médico.
                    </div>
                  ) : (
                    <select className="form-control" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required disabled={modalLoading}>
                      <option value="" disabled>Selecione</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Intervalo</label>
                  <select className="form-control" value={interval} onChange={(e) => setInterval(e.target.value)} disabled={modalLoading}>
                    <option value="10">10 minutos</option>
                    <option value="15">15 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                  </select>
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Turno da Manhã (Obrigatório)</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Início</label>
                    <input type="time" className="form-control" value={startTimeMorning} onChange={(e) => setStartTimeMorning(e.target.value)} required disabled={modalLoading}/>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fim</label>
                    <input type="time" className="form-control" value={endTimeMorning} onChange={(e) => setEndTimeMorning(e.target.value)} required disabled={modalLoading}/>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Turno da Tarde (Opcional)</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Início</label>
                    <input type="time" className="form-control" value={startTimeAfternoon} onChange={(e) => setStartTimeAfternoon(e.target.value)} disabled={modalLoading}/>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fim</label>
                    <input type="time" className="form-control" value={endTimeAfternoon} onChange={(e) => setEndTimeAfternoon(e.target.value)} disabled={modalLoading}/>
                  </div>
                </div>
              </div>

              {modalError && <div className="auth-error" style={{marginBottom:'1rem'}}><span>{modalError}</span></div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={modalLoading}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>{modalLoading ? 'Salvando...' : 'Salvar Escala'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
