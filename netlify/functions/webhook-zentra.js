import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, api-secret",
};

// Configuração do Supabase (usando variáveis de ambiente do Netlify)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

// Função para salvar pagamento no Supabase
async function salvarPagamentoZentra(dadosPagamento) {
  if (!supabase) {
    console.log('⚠️ Supabase não configurado, salvando em log');
    console.log('💾 Dados do pagamento:', dadosPagamento);
    return { success: true, method: 'log' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        status_pagamento: 'pago',
        etapa_atual: 6, // Etapa liberado
        updated_at: new Date().toISOString()
      })
      .eq('cpf', dadosPagamento.cpf.replace(/[^\d]/g, ''))
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar pagamento no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Pagamento atualizado no Supabase:', data);
    return { success: true, data, method: 'supabase' };
  } catch (error) {
    console.error('❌ Erro na função salvarPagamentoZentra:', error);
    return { success: false, error: error.message };
  }
}

// Função para atualizar rastreamento
async function atualizarRastreamentoPorCPF(cpf, dadosAtualizacao) {
  if (!supabase) {
    console.log('⚠️ Supabase não configurado para atualização de rastreamento');
    console.log('📦 CPF:', cpf, 'Dados:', dadosAtualizacao);
    return { success: true, method: 'log' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        etapa_atual: dadosAtualizacao.liberado ? 6 : 5,
        status_pagamento: dadosAtualizacao.liberado ? 'pago' : 'pendente',
        updated_at: new Date().toISOString()
      })
      .eq('cpf', cpf.replace(/[^\d]/g, ''))
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar rastreamento:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Rastreamento atualizado:', data);
    return { success: true, data, method: 'supabase' };
  } catch (error) {
    console.error('❌ Erro na atualização do rastreamento:', error);
    return { success: false, error: error.message };
  }
}

// Handler principal da Netlify Function
export default async function handler(req, res) {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Método não permitido',
        message: 'Este endpoint aceita apenas requisições POST'
      });
    }

    console.log('🔔 Webhook Zentra Pay recebido');
    console.log('📡 Headers:', req.headers);
    console.log('📦 Body:', req.body);

    const body = req.body;

    // Verificação de autenticação com chave secreta
    const zentraSecret = 'sk_ab923f7fd51de54a45f835645cae6c73c9ac37e65e28b79fd7d13efb030d74c6cebab32534d07a5f80a871196121732a129ef02e3732504b1a56b8d1972ebbf1';
    const tokenRecebido = req.headers['api-secret'] || req.headers['authorization'];

    if (zentraSecret && tokenRecebido !== zentraSecret) {
      console.log('❌ Token inválido recebido:', tokenRecebido);
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'api-secret header é obrigatório'
      });
    }

    // Extrair dados da Zentra Pay
    const {
      status,
      order_id,
      external_id,
      amount,
      payment_method,
      customer_name,
      customer_document,
      customer_email,
      transaction_id,
      pix
    } = body;

    console.log('💳 Dados do pagamento Zentra:', {
      status,
      order_id,
      external_id,
      amount,
      payment_method,
      customer_name,
      customer_document: customer_document ? `${customer_document.substring(0, 3)}***` : 'N/A',
      customer_email,
      transaction_id
    });

    // Processar apenas se o status for "paid" ou "approved"
    if (status === 'paid' || status === 'approved') {
      console.log('✅ Pagamento confirmado, processando...');

      // Salvar dados do pagamento
      const resultadoPagamento = await salvarPagamentoZentra({
        idPedido: order_id || external_id,
        valorPago: amount,
        formaPagamento: payment_method || 'PIX',
        nome: customer_name,
        cpf: customer_document,
        email: customer_email,
        dataConfirmada: new Date().toISOString(),
        transactionId: transaction_id,
        externalId: external_id
      });

      // Atualizar status do rastreamento
      const resultadoRastreamento = await atualizarRastreamentoPorCPF(customer_document, {
        status: 'Pagamento Confirmado',
        liberado: true
      });

      console.log('📊 Resultados do processamento:', {
        pagamento: resultadoPagamento,
        rastreamento: resultadoRastreamento
      });

      return res.status(200).json({ 
        success: true,
        message: 'Pagamento processado com sucesso',
        data: {
          order_id: order_id || external_id,
          status: 'processed',
          timestamp: new Date().toISOString(),
          results: {
            payment_saved: resultadoPagamento.success,
            tracking_updated: resultadoRastreamento.success
          }
        }
      });
    } else {
      console.log(`⚠️ Status não processado: ${status}`);
      return res.status(200).json({ 
        success: true,
        message: `Status ${status} recebido, mas não processado`,
        data: {
          order_id: order_id || external_id,
          status: 'received_not_processed',
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('💥 Erro no webhook Zentra Pay:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Configuração para Netlify Functions
export const config = {
  path: "/webhook/zentra"
};