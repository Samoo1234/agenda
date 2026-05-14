-- ============================================================
-- Migration: Adicionar horários configuráveis às escalas
-- Execute este SQL no Editor SQL do Supabase se já tiver
-- a tabela allocations criada sem os campos de horário.
-- ============================================================

ALTER TABLE public.allocations
ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS interval_minutes INTEGER NOT NULL DEFAULT 30;

-- Remove defaults após adicionar para novos registros exigirem valores
ALTER TABLE public.allocations
ALTER COLUMN start_time DROP DEFAULT,
ALTER COLUMN end_time DROP DEFAULT,
ALTER COLUMN interval_minutes DROP DEFAULT;
