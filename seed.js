import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log('Seeding...');
  
  const { data: branches, error: errb } = await supabase.from('branches').select('id');
  if (errb || branches?.length > 0) {
     console.log('Already seeded or error.', errb);
     return;
  }

  // Create Branches
  const { data: b1 } = await supabase.from('branches').insert({ name: 'São Paulo - Av. Paulista' }).select().single();
  const { data: b2 } = await supabase.from('branches').insert({ name: 'São Bernardo - Centro' }).select().single();
  
  // Create Doctors
  const { data: d1 } = await supabase.from('doctors').insert({ name: 'Dra. Ana Silva', specialty: 'Oftalmologista Geral' }).select().single();
  const { data: d2 } = await supabase.from('doctors').insert({ name: 'Dr. Roberto Santos', specialty: 'Especialista em Córnea' }).select().single();
  
  // Create Allocations
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  if (b1 && d1 && b2 && d2) {
    await supabase.from('allocations').insert([
      { branch_id: b1.id, doctor_id: d1.id, date: today },
      { branch_id: b2.id, doctor_id: d2.id, date: tomorrow }
    ]);
  }
  
  console.log('Done seeding data!');
}

seed();
