import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './SchedulingForm.css';

interface Allocation {
  id: string;
  date: string;
  start_time_morning: string;
  end_time_morning: string;
  start_time_afternoon: string | null;
  end_time_afternoon: string | null;
  interval_minutes: number;
  branches: { name: string } | null;
  doctors: { name: string } | null;
}

interface SchedulingFormProps {
  clinicId: string;
}

export default function SchedulingForm({ clinicId }: SchedulingFormProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const [formData, setFormData] = useState({
    allocation_id: '',
    time: '',
    name: '',
    phone: ''
  });

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllocations = async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase.from('allocations').select(`
      id, date, start_time_morning, end_time_morning, start_time_afternoon, end_time_afternoon, interval_minutes,
      branches (name),
      doctors (name)
    `)
    .eq('clinic_id', clinicId)
    .gte('date', today)
    .order('date');

    if (error) console.error(error);
    if (data) setAllocations(data as unknown as Allocation[]);
  };

  useEffect(() => {
    if (clinicId) {
      fetchAllocations();
    }
  }, [clinicId]);

  useEffect(() => {
    if (formData.allocation_id) {
      generateSlots(formData.allocation_id);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.allocation_id]);

  const generateSlots = async (allocationId: string) => {
    const allocation = allocations.find(a => a.id === allocationId);
    if (!allocation) return;

    const slots: string[] = [];
    
    // Função auxiliar para popular slots
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

    // Gerar horários da manhã
    if (allocation.start_time_morning && allocation.end_time_morning) {
      populateSlots(allocation.start_time_morning, allocation.end_time_morning);
    }

    // Gerar horários da tarde (se houver)
    if (allocation.start_time_afternoon && allocation.end_time_afternoon) {
      populateSlots(allocation.start_time_afternoon, allocation.end_time_afternoon);
    }

    const { data: booked } = await supabase
      .from('appointments')
      .select('time')
      .eq('allocation_id', allocationId);

    const bookedTimes = new Set(booked?.map(a => a.time) ?? []);
    const freeSlots = slots.filter(s => !bookedTimes.has(s));

    setAvailableSlots(freeSlots);
    if (!freeSlots.includes(formData.time)) {
      setFormData(prev => ({ ...prev, time: '' }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('appointments').insert([{
      allocation_id: formData.allocation_id,
      time: formData.time,
      patient_name: formData.name,
      patient_phone: formData.phone,
      status: 'pendente'
    }]);

    setLoading(false);
    
    if (error) {
      alert('Erro ao agendar consulta. Tente novamente.');
      console.error(error);
    } else {
      alert('Agendamento realizado com sucesso!');
      setFormData({ allocation_id: '', time: '', name: '', phone: '' });
      generateSlots(formData.allocation_id); // Atualizar slots disponíveis após agendar
    }
  };

  return (
    <div className="glass-container">
      <form className="scheduling-form" onSubmit={handleSubmit}>
        
        {allocations.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
            Nenhuma agenda disponível no momento.
          </div>
        )}

        <div className="form-group">
          <label htmlFor="allocation_id" className="form-label">Filial e Data Disponível</label>
          <select id="allocation_id" name="allocation_id" className="form-control" value={formData.allocation_id} onChange={handleChange} required disabled={allocations.length === 0}>
            <option value="" disabled>Selecione onde e quando</option>
            {allocations.map(a => (
              <option key={a.id} value={a.id}>
                {formatDate(a.date)} - {a.branches?.name} ({a.doctors?.name})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="time" className="form-label">Horário de Consulta</label>
          <select id="time" name="time" className="form-control" value={formData.time} onChange={handleChange} required disabled={availableSlots.length === 0}>
            <option value="" disabled>
              {availableSlots.length === 0 ? (formData.allocation_id ? 'Sem horários disponíveis' : 'Selecione uma escala primeiro') : 'Selecione um horário'}
            </option>
            {availableSlots.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name" className="form-label">Nome do Paciente</label>
          <input type="text" id="name" name="name" className="form-control" placeholder="Digite o nome completo" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="phone" className="form-label">Telefone (WhatsApp)</label>
          <input type="tel" id="phone" name="phone" className="form-control" placeholder="(11) 90000-0000" value={formData.phone} onChange={handleChange} required />
        </div>

        <button type="submit" className="submit-btn" disabled={loading || allocations.length === 0}>
          {loading ? 'Processando...' : 'Agendar Consulta'}
        </button>
      </form>
    </div>
  );
}
