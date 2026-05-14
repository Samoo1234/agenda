-- ============================================================
-- Vision Care SaaS - Banco de Dados Multi-Tenant
-- Execute este SQL no Editor SQL do Supabase para criar
-- toda a estrutura necessária.
-- ============================================================

-- =====================
-- 0. LIMPEZA (Desenvolvimento)
-- Apaga tabelas antigas caso existam para recriar do zero.
-- =====================
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.allocations CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clinics CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =====================
-- 1. TABELA: clinics (Inquilinos / Clínicas Assinantes)
-- =====================
CREATE TABLE public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- URL amigável (ex: clinica-visao)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================
-- 2. TABELA: profiles (Perfil do usuário logado, vinculado à clínica)
-- =====================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin' NOT NULL, -- 'admin', 'staff' (para expansão futura)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================
-- 3. TABELA: branches (Filiais, agora vinculadas a uma clínica)
-- =====================
CREATE TABLE public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================
-- 4. TABELA: doctors (Médicos, agora vinculados a uma clínica)
-- =====================
CREATE TABLE public.doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    specialty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================
-- 5. TABELA: allocations (Escalas de atendimento)
-- =====================
CREATE TABLE public.allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time_morning TEXT NOT NULL,       -- ex: 08:00
    end_time_morning TEXT NOT NULL,         -- ex: 12:00
    start_time_afternoon TEXT,              -- ex: 14:00 (opcional)
    end_time_afternoon TEXT,                -- ex: 18:00 (opcional)
    interval_minutes INTEGER NOT NULL DEFAULT 30, -- intervalo entre consultas (10, 15, 20, 30)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================
-- 6. TABELA: appointments (Agendamentos de pacientes)
-- =====================
CREATE TABLE public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    allocation_id UUID REFERENCES public.allocations(id) ON DELETE CASCADE NOT NULL,
    time TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) - Ativação
-- ============================================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. FUNÇÃO AUXILIAR: Retorna o clinic_id do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 9. POLÍTICAS DE SEGURANÇA (RLS Policies)
-- ============================================================

-- ---- CLINICS ----
-- Qualquer pessoa pode LER clínicas (necessário para buscar por slug na tela pública)
CREATE POLICY "clinics_public_read" ON public.clinics
  FOR SELECT USING (true);

-- Apenas o dono pode atualizar sua clínica
CREATE POLICY "clinics_owner_update" ON public.clinics
  FOR UPDATE USING (id = public.get_my_clinic_id());

-- Inserção aberta (necessário durante o registro, antes de ter perfil)
CREATE POLICY "clinics_insert" ON public.clinics
  FOR INSERT WITH CHECK (true);

-- ---- PROFILES ----
-- Usuário só vê seu próprio perfil
CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Inserção aberta (trigger de registro cria o perfil)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ---- BRANCHES ----
-- Leitura pública (pacientes precisam ver as filiais para agendar)
CREATE POLICY "branches_public_read" ON public.branches
  FOR SELECT USING (true);

-- Admin da clínica pode inserir/atualizar/deletar SUAS filiais
CREATE POLICY "branches_owner_insert" ON public.branches
  FOR INSERT WITH CHECK (clinic_id = public.get_my_clinic_id());

CREATE POLICY "branches_owner_update" ON public.branches
  FOR UPDATE USING (clinic_id = public.get_my_clinic_id());

CREATE POLICY "branches_owner_delete" ON public.branches
  FOR DELETE USING (clinic_id = public.get_my_clinic_id());

-- ---- DOCTORS ----
-- Leitura pública
CREATE POLICY "doctors_public_read" ON public.doctors
  FOR SELECT USING (true);

-- Admin da clínica gerencia SEUS médicos
CREATE POLICY "doctors_owner_insert" ON public.doctors
  FOR INSERT WITH CHECK (clinic_id = public.get_my_clinic_id());

CREATE POLICY "doctors_owner_update" ON public.doctors
  FOR UPDATE USING (clinic_id = public.get_my_clinic_id());

CREATE POLICY "doctors_owner_delete" ON public.doctors
  FOR DELETE USING (clinic_id = public.get_my_clinic_id());

-- ---- ALLOCATIONS ----
-- Leitura pública (pacientes precisam ver as escalas para agendar)
CREATE POLICY "allocations_public_read" ON public.allocations
  FOR SELECT USING (true);

-- Admin da clínica gerencia SUAS escalas
CREATE POLICY "allocations_owner_insert" ON public.allocations
  FOR INSERT WITH CHECK (clinic_id = public.get_my_clinic_id());

CREATE POLICY "allocations_owner_update" ON public.allocations
  FOR UPDATE USING (clinic_id = public.get_my_clinic_id());

CREATE POLICY "allocations_owner_delete" ON public.allocations
  FOR DELETE USING (clinic_id = public.get_my_clinic_id());

-- ---- APPOINTMENTS ----
-- Admin vê agendamentos da SUA clínica (via allocation -> clinic_id)
CREATE POLICY "appointments_admin_read" ON public.appointments
  FOR SELECT USING (
    allocation_id IN (
      SELECT id FROM public.allocations WHERE clinic_id = public.get_my_clinic_id()
    )
  );

-- Paciente (anônimo) pode inserir agendamentos em qualquer clínica pública
CREATE POLICY "appointments_public_insert" ON public.appointments
  FOR INSERT WITH CHECK (true);

-- Admin pode atualizar status dos agendamentos da sua clínica
CREATE POLICY "appointments_admin_update" ON public.appointments
  FOR UPDATE USING (
    allocation_id IN (
      SELECT id FROM public.allocations WHERE clinic_id = public.get_my_clinic_id()
    )
  );

-- ============================================================
-- 10. TRIGGER: Criar perfil automaticamente ao registrar
-- (Usado durante o fluxo de registro - o clinic_id é passado via metadata)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, clinic_id, full_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'clinic_id')::UUID,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
