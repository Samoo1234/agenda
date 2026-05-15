import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Save, Trash2, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const branchParam = searchParams.get('branch');
    if (branchParam) {
      setSelectedBranch(branchParam);
    }
  }, [searchParams]);

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
      const branchParam = searchParams.get('branch');
      if (!branchParam) {
        setSelectedBranch(data[0].id);
      }
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

  const printSummary = () => {
    window.print();
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

      setRecords(mergedRecords);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
    } finally {
      setLoading(false);
    }
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

      // 2. Limpar pagamentos antigos e inserir novos para este registro
      // Usamos o ID que veio do banco (mainData.id) para garantir a limpeza total
      await supabase.from('financial_payments').delete().eq('record_id', mainData.id);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleCurrencyChange = (value: string, callback: (num: number) => void) => {
    const cleanValue = value.replace(/\D/g, '');
    const numberValue = cleanValue ? parseFloat(cleanValue) / 100 : 0;
    callback(numberValue);
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

  const summaryByType = Object.entries(summaries.byType).map(([type, data]: [string, any]) => ({
    type,
    ...data
  }));

  const summaryByMethod = Object.entries(summaries.byMethod).map(([method, data]: [string, any]) => ({
    method,
    ...data
  }));

  return (
    <div className="financial-container">
      <header className="panel-header">
        <div>
          <h1>Registros Financeiros</h1>
          <p className="text-muted">Lançamento financeiro diário</p>
        </div>
        <div className="header-filters">
          <div className="filter-item">
            <span className="filter-label">Filial</span>
            <select 
              className="select-cell w-auto"
              style={{ minWidth: '200px' }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <span className="filter-label">Data de Referência</span>
            <select 
              className="select-cell w-auto"
              style={{ minWidth: '220px' }}
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
          </div>

          <button className="btn-print" onClick={printSummary}>
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
                  <td>{Number(summaries.byType[type].total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td>{records.length}</td>
                <td>{Number(totalType).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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
                  <td>{Number(summaries.byMethod[method].total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td>-</td>
                <td>{Number(totalMethod).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <p className="text-muted">Carregando lançamentos...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <p className="text-muted">Nenhum agendamento encontrado para esta data e filial.</p>
                </td>
              </tr>
            ) : (
              records.map((record, idx) => {
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
                        disabled={!!record.appointment_id}
                        onChange={(e) => updateRecord(idx, { client_name: e.target.value })}
                      />
                    </td>
                    <td width="140">
                      <div className="currency-input-wrapper">
                        <span className="currency-prefix">R$</span>
                        <input 
                          type="text" 
                          className="input-cell" 
                          value={formatCurrency(record.amount)}
                          onChange={(e) => handleCurrencyChange(e.target.value, (val) => updateRecord(idx, { amount: val }))}
                        />
                      </div>
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
                            <div className="currency-input-wrapper flex-1">
                              <span className="currency-prefix text-xs">R$</span>
                              <input 
                                type="text" 
                                className="input-cell text-xs p-1"
                                value={formatCurrency(p.amount)}
                                onChange={(e) => handleCurrencyChange(e.target.value, (val) => updatePayment(idx, pIdx, { amount: val }))}
                              />
                            </div>
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
              })
            )}
          </tbody>
        </table>
      </section>
      {/* Área de Impressão (Oculta na tela) */}
      <div id="print-report" className="print-only">
        <div className="print-header">
          <div className="print-title-group">
            <h1>Relatório de Fechamento Financeiro</h1>
            <p className="print-subtitle">{clinic?.name} - {branches.find(b => b.id === selectedBranch)?.name}</p>
          </div>
          <div className="print-date-info">
            <p><strong>Data de Referência:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Gerado em:</strong> {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="print-grid">
          <div className="print-section">
            <h3>Resumo por Tipo</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryByType.map(s => (
                  <tr key={s.type}>
                    <td>{s.type}</td>
                    <td>{s.count}</td>
                    <td className="text-right">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>Resumo por Forma de Pagamento</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Qtd</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryByMethod.map(s => (
                  <tr key={s.method}>
                    <td>{s.method}</td>
                    <td>{s.count}</td>
                    <td className="text-right">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-section">
          <h3>Detalhamento de Atendimentos</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tipo</th>
                <th>Pagamentos</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id || record.appointment_id}>
                  <td>{record.client_name}</td>
                  <td>{record.type}</td>
                  <td>
                    {record.payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(' | ')}
                  </td>
                  <td className="text-right">{formatCurrency(record.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right"><strong>TOTAL GERAL</strong></td>
                <td className="text-right"><strong>{formatCurrency(summaryByType.reduce((acc, curr) => acc + curr.total, 0))}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-footer">
          <div className="signature-line">
            <div className="line"></div>
            <p>Assinatura do Responsável</p>
          </div>
          <p className="print-disclaimer">Documento gerado pelo sistema de gestão Vision Care.</p>
        </div>
      </div>
    </div>
  );
}
