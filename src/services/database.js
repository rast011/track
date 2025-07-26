/**
 * Serviço de banco de dados com Supabase
 */
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export class DatabaseService {
    constructor() {
        this.supabase = supabase;
        this.isConfigured = isSupabaseConfigured();
        if (!this.isConfigured) {
            console.warn('⚠️ Supabase não configurado. Usando armazenamento local como fallback.');
        }
    }

    async getAllLeads() {
        if (!this.isConfigured) {
            return this.getAllLeadsFallback();
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar leads do Supabase:', error);
                return this.getAllLeadsFallback();
            }

            console.log(`✅ ${data?.length || 0} leads carregados do Supabase`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro na busca de leads:', error);
            return this.getAllLeadsFallback();
        }
    }

    getAllLeadsFallback() {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            console.log(`📦 ${leads.length} leads carregados do localStorage`);
            return { success: true, data: leads };
        } catch (error) {
            console.error('Erro no fallback de busca de leads:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    async createLead(leadData) {
        if (!this.isConfigured) {
            return this.createLeadFallback(leadData);
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert([leadData])
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar lead:', error);
                return this.createLeadFallback(leadData);
            }

            console.log('✅ Lead criado no Supabase:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Erro na criação do lead:', error);
            return this.createLeadFallback(leadData);
        }
    }

    async getLeadByCPF(cpf) {
        if (!this.isConfigured) {
            return this.getLeadByCPFFallback(cpf);
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('cpf', cpf.replace(/[^\d]/g, ''))
                .maybeSingle();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Erro ao buscar lead:', error);
                return this.getLeadByCPFFallback(cpf);
            }

            return { success: true, data: data || null };
        } catch (error) {
            console.error('Erro na busca do lead:', error);
            return this.getLeadByCPFFallback(cpf);
        }
    }

    async updateLeadStage(cpf, etapaAtual) {
        if (!this.isConfigured) {
            return this.updateLeadStageFallback(cpf, etapaAtual);
        }

        try {
            // Limpar CPF se for passado como ID
            const cleanCPF = typeof cpf === 'string' ? cpf.replace(/[^\d]/g, '') : cpf;
            
            const { data, error } = await supabase
                .from('leads')
                .update({ 
                    etapa_atual: etapaAtual,
                    updated_at: new Date().toISOString()
                })
                .eq('cpf', cleanCPF)
                .select();

            if (error) {
                console.error('Erro ao atualizar etapa:', error);
                return this.updateLeadStageFallback(cleanCPF, etapaAtual);
            }

            console.log('✅ Etapa atualizada no Supabase:', data?.[0]);
            return { success: true, data: data?.[0] };
        } catch (error) {
            console.error('Erro na atualização da etapa:', error);
            return this.updateLeadStageFallback(cleanCPF, etapaAtual);
        }
    }

    async updatePaymentStatus(cpf, status) {
        if (!this.isConfigured) {
            return this.updatePaymentStatusFallback(cpf, status);
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .update({ status_pagamento: status })
                .eq('cpf', cpf.replace(/[^\d]/g, ''))
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar status de pagamento:', error);
                return this.updatePaymentStatusFallback(cpf, status);
            }

            console.log('✅ Status de pagamento atualizado no Supabase:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Erro na atualização do status de pagamento:', error);
            return this.updatePaymentStatusFallback(cpf, status);
        }
    }

    // Métodos de fallback usando localStorage
    createLeadFallback(leadData) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const newLead = {
                ...leadData,
                id: Date.now().toString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            leads.push(newLead);
            localStorage.setItem('leads', JSON.stringify(leads));
            console.log('✅ Lead criado no localStorage:', newLead);
            return { success: true, data: newLead };
        } catch (error) {
            console.error('Erro no fallback de criação:', error);
            return { success: false, error: error.message };
        }
    }

    getLeadByCPFFallback(cpf) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const lead = leads.find(l => l.cpf === cpf.replace(/[^\d]/g, ''));
            return { success: true, data: lead || null };
        } catch (error) {
            console.error('Erro no fallback de busca:', error);
            return { success: false, error: error.message };
        }
    }

    updateLeadStageFallback(cpf, etapaAtual) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const leadIndex = leads.findIndex(l => l.cpf === cpf.replace(/[^\d]/g, ''));
            
            if (leadIndex !== -1) {
                leads[leadIndex].etapa_atual = etapaAtual;
                leads[leadIndex].updated_at = new Date().toISOString();
                localStorage.setItem('leads', JSON.stringify(leads));
                console.log('✅ Etapa atualizada no localStorage:', leads[leadIndex]);
                return { success: true, data: leads[leadIndex] };
            }
            
            return { success: false, error: 'Lead não encontrado' };
        } catch (error) {
            console.error('Erro no fallback de atualização:', error);
            return { success: false, error: error.message };
        }
    }

    updatePaymentStatusFallback(cpf, status) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const leadIndex = leads.findIndex(l => l.cpf === cpf.replace(/[^\d]/g, ''));
            
            if (leadIndex !== -1) {
                leads[leadIndex].status_pagamento = status;
                leads[leadIndex].updated_at = new Date().toISOString();
                localStorage.setItem('leads', JSON.stringify(leads));
                console.log('✅ Status de pagamento atualizado no localStorage:', leads[leadIndex]);
                return { success: true, data: leads[leadIndex] };
            }
            
            return { success: false, error: 'Lead não encontrado' };
        } catch (error) {
            console.error('Erro no fallback de atualização de pagamento:', error);
            return { success: false, error: error.message };
        }
    }
}