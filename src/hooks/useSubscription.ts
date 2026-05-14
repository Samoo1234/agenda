import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_branches: number;
  max_doctors: number;
  max_appointments_month: number;
  features: string[];
}

interface SubscriptionInfo {
  plan: Plan | null;
  allPlans: Plan[];
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  daysLeft: number;
  isTrialing: boolean;
  isActive: boolean;
  isExpired: boolean;
  loading: boolean;
  currentBranches: number;
  currentDoctors: number;
  canAddBranch: () => boolean;
  canAddDoctor: () => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionInfo {
  const { clinic } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trialing');
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBranches, setCurrentBranches] = useState(0);
  const [currentDoctors, setCurrentDoctors] = useState(0);

  const fetchSubscription = async () => {
    if (!clinic?.id) {
      setLoading(false);
      return;
    }

    try {
      // Buscar dados atualizados da clínica com o plano
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('plan_id, subscription_status, trial_ends_at')
        .eq('id', clinic.id)
        .single();

      if (clinicError) throw clinicError;

      // Buscar todos os planos
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly');

      if (plansError) throw plansError;
      setAllPlans(plansData || []);

      // Setar plano atual
      const currentPlan = plansData?.find(p => p.id === clinicData.plan_id) || null;
      setPlan(currentPlan);
      setSubscriptionStatus(clinicData.subscription_status || 'trialing');
      setTrialEndsAt(clinicData.trial_ends_at ? new Date(clinicData.trial_ends_at) : null);

      // Contar recursos em uso
      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);

      const { count: doctorCount } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);

      setCurrentBranches(branchCount || 0);
      setCurrentDoctors(doctorCount || 0);

    } catch (error) {
      console.error('Erro ao buscar subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [clinic?.id]);

  // Calcular dias restantes do trial
  const now = new Date();
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialing = subscriptionStatus === 'trialing' && daysLeft > 0;
  const isActive = subscriptionStatus === 'active';
  const isExpired = subscriptionStatus === 'expired' || (subscriptionStatus === 'trialing' && daysLeft <= 0 && trialEndsAt !== null);

  // Feature gating
  const canAddBranch = () => {
    if (!plan) return false;
    if (plan.max_branches === -1) return true; // ilimitado
    return currentBranches < plan.max_branches;
  };

  const canAddDoctor = () => {
    if (!plan) return false;
    if (plan.max_doctors === -1) return true; // ilimitado
    return currentDoctors < plan.max_doctors;
  };

  return {
    plan,
    allPlans,
    subscriptionStatus,
    trialEndsAt,
    daysLeft,
    isTrialing,
    isActive,
    isExpired,
    loading,
    currentBranches,
    currentDoctors,
    canAddBranch,
    canAddDoctor,
    refresh: fetchSubscription,
  };
}
