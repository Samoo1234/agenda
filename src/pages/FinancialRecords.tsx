import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Trash2, CreditCard, ChevronDown, CheckCircle2, AlertCircle, Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Financial.css';

interface Payment {
  method: string;
  amount: number;
}

interface FinancialRecord {
  id?: string;
  appointment_id?: string;
  branch_id: string;
  client_name: string;
  amount: number;
  type: string;
  status: string;
  notes: string;
  payments: Payment[];
  isEditing?: boolean;
}

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Boleto', 'Outros'];
const RECORD_TYPES = ['Particular', 'Convênio', 'Campanha', 'Exames', 'Revisão'];
const RECORD_STATUSES = ['Caso Clínico', 'Efetivação', 'Perda'];

export default function FinancialRecords() {
  const { clinic } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (clinic?.id) {
      fetchBranches();
    }
  }, [clinic?.id]);

  useEffect(() => {
    if (clinic?.id && selectedBranch) {
      fetchAvailableDates();
      fetchRecords();
    }
  }, [clinic?.id, selectedDate, selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('clinic_id', clinic?.id);
    
    if (data && data.length > 0) {
      setBranches(data);
      setSelectedBranch(data[0].id);
    }
  };

  const fetchAvailableDates = async () => {
    if (!clinic?.id || !selectedBranch) return;

    // Busca datas únicas que possuem agendamentos na filial
    const { data } = await supabase
      .from('allocations')
      .select('date')
      .eq('clinic_id', clinic.id)
      .eq('branch_id', selectedBranch)
      .order('date', { ascending: false });

    if (data) {
      const uniqueDates = Array.from(new Set(data.map(d => d.date)));
      setAvailableDates(uniqueDates);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // 1. Buscar agendamentos do dia filtrando por FILIAL e DATA
      const { data: allocations, error: allocError } = await supabase
        .from('allocations')
        .select(`
          id,
          appointments (
            id,
            patient_name,
            status
          )
        `)
        .eq('clinic_id', clinic?.id)
        .eq('branch_id', selectedBranch)
        .eq('date', selectedDate);

      if (allocError) throw allocError;

      const dayAppointments = allocations?.flatMap(a => a.appointments) || [];

      // 2. Buscar registros financeiros já salvos para esta FILIAL e DATA
      const { data: finData, error: finError } = await supabase
        .from('financial_records')
        .select(`
          *,
          financial_payments (*)
        `)
        .eq('clinic_id', clinic?.id)
        .eq('branch_id', selectedBranch)
        .eq('date', selectedDate);

      if (finError) throw finError;

      // 3. Mesclar dados
      const mergedRecords: FinancialRecord[] = dayAppointments.map(app => {
        const existingFin = finData?.find(f => f.appointment_id === app.id);
        
        if (existingFin) {
          return {
            id: existingFin.id,
            appointment_id: app.id,
            branch_id: existingFin.branch_id,
            client_name: app.patient_name,
            amount: existingFin.total_amount,
            type: existingFin.type,
            status: existingFin.status,
            notes: existingFin.notes || '',
            payments: existingFin.financial_payments.map((p: any) => ({
              method: p.method,
              amount: p.amount
            }))
          };
        }

        return {
          appointment_id: app.id,
          branch_id: selectedBranch,
          client_name: app.patient_name,
          amount: 0,
          type: 'Particular',
          status: 'Caso Clínico',
          notes: '',
          payments: [],
          isEditing: true
        };
      });

      const manualRecords = finData?.filter(f => !f.appointment_id).map(rec => ({
        id: rec.id,
        branch_id: rec.branch_id,
        client_name: rec.notes?.split('\n')[0] || 'Cliente Manual',
        amount: rec.total_amount,
        type: rec.type,
        status: rec.status,
        notes: rec.notes || '',
        payments: rec.financial_payments.map((p: any) => ({
          method: p.method,
          amount: p.amount
        }))
      })) || [];

      setRecords([...mergedRecords, ...manualRecords]);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
    } finally {
      setLoading(false);
    }
  };

  const addRecord = () => {
    const newRecord: FinancialRecord = {
      branch_id: selectedBranch,
      client_name: '',
      amount: 0,
      type: 'Particular',
      status: 'Caso Clínico',
      notes: '',
      payments: [],
      isEditing: true
    };
    setRecords([newRecord, ...records]);
  };

  const updateRecord = (index: number, updates: Partial<FinancialRecord>) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], ...updates };
    setRecords(newRecords);
  };

  const addPayment = (recordIndex: number) => {
    const record = records[recordIndex];
    const remaining = record.amount - record.payments.reduce((sum, p) => sum + p.amount, 0);
    
    updateRecord(recordIndex, {
      payments: [...record.payments, { method: 'Dinheiro', amount: Math.max(0, remaining) }]
    });
  };

  const updatePayment = (recordIndex: number, paymentIndex: number, updates: Partial<Payment>) => {
    const record = records[recordIndex];
    const newPayments = [...record.payments];
    newPayments[paymentIndex] = { ...newPayments[paymentIndex], ...updates };
    updateRecord(recordIndex, { payments: newPayments });
  };

  const removePayment = (recordIndex: number, paymentIndex: number) => {
    const record = records[recordIndex];
    updateRecord(recordIndex, {
      payments: record.payments.filter((_, i) => i !== paymentIndex)
    });
  };

  const saveRecord = async (index: number) => {
    const record = records[index];
    if (!clinic?.id || !selectedBranch) return;

    try {
      const { data: mainData, error: mainError } = await supabase
        .from('financial_records')
        .upsert({
          id: record.id,
          clinic_id: clinic.id,
          branch_id: selectedBranch,
          appointment_id: record.appointment_id,
          date: selectedDate,
          total_amount: record.amount,
          type: record.type,
          status: record.status,
          notes: record.notes
        })
        .select()
        .single();

      if (mainError) throw mainError;

      // 2. Limpar pagamentos antigos e inserir novos
      if (record.id) {
        await supabase.from('financial_payments').delete().eq('record_id', record.id);
      }

      const { error: payError } = await supabase
        .from('financial_payments')
        .insert(record.payments.map(p => ({
          record_id: mainData.id,
          method: p.method,
          amount: p.amount
        })));

      if (payError) throw payError;

      fetchRecords();
    } catch (err) {
      alert('Erro ao salvar registro financeiro');
      console.error(err);
    }
  };

  // Cálculos de Resumo
  const summaries = useMemo(() => {
    const byType = RECORD_TYPES.reduce((acc, type) => {
      acc[type] = { count: 0, total: 0 };
      return acc;
    }, {} as any);

    const byMethod = PAYMENT_METHODS.reduce((acc, method) => {
      acc[method] = { count: 0, total: 0 };
      return acc;
    }, {} as any);

    records.forEach(rec => {
      if (byType[rec.type]) {
        byType[rec.type].count++;
        byType[rec.type].total += rec.amount;
      }
      rec.payments.forEach(p => {
        if (byMethod[p.method]) {
          byMethod[p.method].count++;
          byMethod[p.method].total += p.amount;
        }
      });
    });

    return { byType, byMethod };
  }, [records]);

  const totalType = Object.values(summaries.byType).reduce((sum: any, val: any) => sum + val.total, 0);
  const totalMethod = Object.values(summaries.byMethod).reduce((sum: any, val: any) => sum + val.total, 0);

  return (
    <div className="financial-container">
      <header className="panel-header">
        <div>
          <h1>Registros Financeiros</h1>
          <p className="text-muted">Lançamento financeiro diário</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="select-cell w-auto"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select 
            className="select-cell w-auto"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">Selecionar Data...</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' })}
              </option>
            ))}
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <Printer size={18} /> Imprimir Resumo
          </button>
        </div>
      </header>

      <section className="financial-summaries">
        <div className="summary-card">
          <h3>Resumo Por Tipo</h3>
          <table className="summary-table">
            <thead>
              <tr>
                <th>TIPO</th>
                <th>QUANTIDADE</th>
                <th>TOTAL (R$)</th>
              </tr>
            </thead>
            <tbody>
              {RECORD_TYPES.map(type => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{summaries.byType[type].count}</td>
                  <td>{summaries.byType[type].total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td>{records.length}</td>
                <td>{totalType.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="summary-card">
          <h3>Resumo Por Forma de Pagamento</h3>
          <table className="summary-table">
            <thead>
              <tr>
                <th>FORMA DE PAGAMENTO</th>
                <th>QUANTIDADE</th>
                <th>TOTAL (R$)</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENT_METHODS.map(method => (
                <tr key={method}>
                  <td>{method}</td>
                  <td>{summaries.byMethod[method].count}</td>
                  <td>{summaries.byMethod[method].total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td>-</td>
                <td>{totalMethod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="financial-grid-panel">
        <table className="financial-table">
          <thead>
            <tr>
              <th>CLIENTE</th>
              <th>VALOR (R$)</th>
              <th>TIPO</th>
              <th>FORMA DE PAGAMENTO</th>
              <th>SITUAÇÃO</th>
              <th>OBSERVAÇÕES</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => {
              const paidTotal = record.payments.reduce((sum, p) => sum + p.amount, 0);
              const diff = record.amount - paidTotal;
              const isDiffOk = Math.abs(diff) < 0.01;

              return (
                <tr key={record.id || idx}>
                  <td>
                    <input 
                      type="text" 
                      className="input-cell" 
                      placeholder="Nome do Cliente"
                      value={record.client_name}
                      onChange={(e) => updateRecord(idx, { client_name: e.target.value })}
                    />
                  </td>
                  <td width="120">
                    <input 
                      type="number" 
                      className="input-cell" 
                      value={record.amount}
                      onChange={(e) => updateRecord(idx, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <select 
                      className="select-cell"
                      value={record.type}
                      onChange={(e) => updateRecord(idx, { type: e.target.value })}
                    >
                      {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="payments-column">
                      {record.payments.map((p, pIdx) => (
                        <div key={pIdx} className="payment-item">
                          <select 
                            className="select-cell text-xs p-1 w-24"
                            value={p.method}
                            onChange={(e) => updatePayment(idx, pIdx, { method: e.target.value })}
                          >
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input 
                            type="number" 
                            className="input-cell text-xs p-1 w-20"
                            value={p.amount}
                            onChange={(e) => updatePayment(idx, pIdx, { amount: parseFloat(e.target.value) || 0 })}
                          />
                          <button onClick={() => removePayment(idx, pIdx)} className="text-red-500 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addPayment(idx)} className="add-payment-btn">
                        <Plus size={14} /> Adicionar Pagamento
                      </button>
                      <div className={`diff-indicator ${isDiffOk ? 'diff-ok' : 'diff-error'}`}>
                        {isDiffOk ? (
                          <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Total OK</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle size={12} /> Faltam R$ {diff.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <select 
                      className="select-cell"
                      value={record.status}
                      onChange={(e) => updateRecord(idx, { status: e.target.value })}
                    >
                      {RECORD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <textarea 
                      className="input-cell" 
                      rows={1}
                      value={record.notes}
                      onChange={(e) => updateRecord(idx, { notes: e.target.value })}
                    />
                  </td>
                  <td>
                    <button 
                      className="save-row-btn"
                      onClick={() => saveRecord(idx)}
                      disabled={!isDiffOk || !record.client_name}
                    >
                      <Save size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
