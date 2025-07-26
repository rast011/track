/**
 * Painel Administrativo K7 - Logix Express
 * Sistema completo de gerenciamento de leads
 */
import { supabase } from '../config/supabase.js';
import { DatabaseService } from '../services/database.js';
import { CPFValidator } from '../utils/cpf-validator.js';

class AdminPanel {
    constructor() {
        this.dbService = new DatabaseService();
        this.leads = [];
        this.filteredLeads = [];
        this.currentEditingLead = null;
        this.systemMode = 'auto'; // 'auto' ou 'manual'
        this.autoUpdateInterval = null;
        this.searchTerm = '';
        this.dateFilter = '';
        
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando Painel Administrativo K7');
        
        // Configurar eventos de login
        this.setupLoginEvents();
        
        // Verificar se já está logado
        if (this.isLoggedIn()) {
            this.showAdminPanel();
        }
    }

    setupLoginEvents() {
        const loginForm = document.getElementById('loginForm');
        const passwordInput = document.getElementById('passwordInput');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    handleLogin() {
        const passwordInput = document.getElementById('passwordInput');
        const errorMessage = document.getElementById('errorMessage');
        const password = passwordInput.value;
        
        if (password === 'secretkey') {
            // Login bem-sucedido
            localStorage.setItem('admin_logged_in', 'true');
            this.showAdminPanel();
        } else {
            // Senha incorreta
            errorMessage.textContent = 'Senha incorreta';
            errorMessage.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    isLoggedIn() {
        return localStorage.getItem('admin_logged_in') === 'true';
    }

    showAdminPanel() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Configurar eventos do painel
        this.setupAdminEvents();
        
        // Carregar dados iniciais
        this.loadLeads();
        
        // Iniciar modo automático se configurado
        this.initializeAutoMode();
    }

    setupAdminEvents() {
        // Logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.logout();
            });
        }

        // Controles do sistema
        this.setupSystemControls();
        
        // Modal de edição
        this.setupEditModal();
        
        // Busca e filtros
        this.setupSearchAndFilters();
    }

    setupSystemControls() {
        // Modo do sistema
        const systemMode = document.getElementById('systemMode');
        if (systemMode) {
            systemMode.addEventListener('change', (e) => {
                this.setSystemMode(e.target.value);
            });
        }

        // Botões de ação em massa
        const nextAllButton = document.getElementById('nextAllButton');
        const prevAllButton = document.getElementById('prevAllButton');
        const refreshButton = document.getElementById('refreshButton');
        const clearAllButton = document.getElementById('clearAllButton');

        if (nextAllButton) {
            nextAllButton.addEventListener('click', () => {
                this.nextAllLeads();
            });
        }

        if (prevAllButton) {
            prevAllButton.addEventListener('click', () => {
                this.prevAllLeads();
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.loadLeads();
            });
        }

        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => {
                this.clearAllLeads();
            });
        }
    }

    setupEditModal() {
        const closeEditModal = document.getElementById('closeEditModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const editForm = document.getElementById('editForm');

        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditedLead();
            });
        }

        // Fechar modal ao clicar fora
        const editModal = document.getElementById('editModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    this.closeEditModal();
                }
            });
        }
    }

    setupSearchAndFilters() {
        const searchInput = document.getElementById('searchInput');
        const dateFilter = document.getElementById('dateFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterLeads();
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.dateFilter = e.target.value;
                this.filterLeads();
            });
        }
    }

    async loadLeads() {
        console.log('📊 Carregando leads do banco de dados...');
        
        try {
            // Simular carregamento do Supabase
            const result = await this.dbService.getAllLeads();
            
            if (result.success) {
                this.leads = result.data || [];
            } else {
                // Fallback para localStorage
                this.leads = this.getLeadsFromLocalStorage();
            }
            
            console.log(`✅ ${this.leads.length} leads carregados`);
            this.filterLeads();
            this.updateLeadsCount();
            
        } catch (error) {
            console.error('❌ Erro ao carregar leads:', error);
            this.leads = this.getLeadsFromLocalStorage();
            this.filterLeads();
            this.updateLeadsCount();
        }
    }

    getLeadsFromLocalStorage() {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            return leads.map(lead => ({
                ...lead,
                created_at: lead.created_at || new Date().toISOString(),
                updated_at: lead.updated_at || new Date().toISOString(),
                etapa_atual: lead.etapa_atual || 1
            }));
        } catch (error) {
            console.error('❌ Erro ao carregar do localStorage:', error);
            return [];
        }
    }

    filterLeads() {
        this.filteredLeads = this.leads.filter(lead => {
            // Filtro por busca (nome ou CPF)
            const matchesSearch = !this.searchTerm || 
                lead.nome_completo?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                lead.cpf?.includes(this.searchTerm.replace(/[^\d]/g, ''));

            // Filtro por data
            const matchesDate = !this.dateFilter || 
                new Date(lead.created_at).toDateString() === new Date(this.dateFilter).toDateString();

            return matchesSearch && matchesDate;
        });

        this.renderLeadsTable();
    }

    renderLeadsTable() {
        const tableBody = document.getElementById('leadsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (!tableBody) return;

        if (this.filteredLeads.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        tableBody.innerHTML = this.filteredLeads.map(lead => {
            const createdDate = new Date(lead.created_at).toLocaleDateString('pt-BR');
            const updatedDate = new Date(lead.updated_at).toLocaleString('pt-BR');
            const stageName = this.getStageNameByNumber(lead.etapa_atual || 1);
            
            return `
                <tr>
                    <td>${lead.nome_completo || 'Nome não informado'}</td>
                    <td>${CPFValidator.formatCPF(lead.cpf || '')}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="stage-badge ${lead.etapa_atual >= 11 ? 'completed' : 'pending'}">
                            ${lead.etapa_atual || 1} - ${stageName}
                        </span>
                    </td>
                    <td>${updatedDate}</td>
                    <td>
                        <div class="lead-actions">
                            <button class="action-button edit" onclick="adminPanel.editLead('${lead.id || lead.cpf}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="action-button next" onclick="adminPanel.nextStage('${lead.id || lead.cpf}')">
                                <i class="fas fa-forward"></i> Próxima
                            </button>
                            <button class="action-button prev" onclick="adminPanel.prevStage('${lead.id || lead.cpf}')">
                                <i class="fas fa-backward"></i> Anterior
                            </button>
                            <button class="action-button delete" onclick="adminPanel.deleteLead('${lead.id || lead.cpf}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStageNameByNumber(stageNumber) {
        const stages = {
            1: 'Pedido criado',
            2: 'Preparando envio',
            3: 'Enviado da China',
            4: 'Centro triagem',
            5: 'Centro logístico',
            6: 'Trânsito internacional',
            7: 'Liberado exportação',
            8: 'Saiu da origem',
            9: 'Chegou no Brasil',
            10: 'Trânsito Curitiba',
            11: 'Alfândega importação'
        };
        
        return stages[stageNumber] || 'Desconhecido';
    }

    updateLeadsCount() {
        const leadsCount = document.getElementById('leadsCount');
        if (leadsCount) {
            const total = this.leads.length;
            const filtered = this.filteredLeads.length;
            
            if (this.searchTerm || this.dateFilter) {
                leadsCount.textContent = `${filtered} de ${total} leads`;
            } else {
                leadsCount.textContent = `${total} leads`;
            }
        }
    }

    // Ações individuais de lead
    async nextStage(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) return;

        const currentStage = lead.etapa_atual || 1;
        if (currentStage >= 11) {
            alert('Lead já está na última etapa');
            return;
        }

        await this.updateLeadStage(leadId, currentStage + 1);
    }

    async prevStage(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) return;

        const currentStage = lead.etapa_atual || 1;
        if (currentStage <= 1) {
            alert('Lead já está na primeira etapa');
            return;
        }

        await this.updateLeadStage(leadId, currentStage - 1);
    }

    async updateLeadStage(leadId, newStage) {
        try {
            const result = await this.dbService.updateLeadStage(leadId, newStage);
            
            if (result.success) {
                // Atualizar lead local
                const lead = this.findLeadById(leadId);
                if (lead) {
                    lead.etapa_atual = newStage;
                    lead.updated_at = new Date().toISOString();
                }
                
                // Atualizar localStorage como backup
                this.updateLocalStorageLead(leadId, { etapa_atual: newStage });
                
                // Recarregar tabela
                this.filterLeads();
                
                console.log(`✅ Lead ${leadId} atualizado para etapa ${newStage}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar etapa:', error);
            alert('Erro ao atualizar etapa do lead');
        }
    }

    editLead(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) return;

        this.currentEditingLead = lead;
        
        // Preencher formulário
        document.getElementById('editName').value = lead.nome_completo || '';
        document.getElementById('editCPF').value = lead.cpf || '';
        document.getElementById('editEmail').value = lead.email || '';
        document.getElementById('editPhone').value = lead.telefone || '';
        document.getElementById('editAddress').value = lead.endereco || '';
        document.getElementById('editStage').value = lead.etapa_atual || 1;
        
        // Mostrar modal
        document.getElementById('editModal').style.display = 'flex';
    }

    async saveEditedLead() {
        if (!this.currentEditingLead) return;

        const updatedData = {
            nome_completo: document.getElementById('editName').value,
            cpf: document.getElementById('editCPF').value.replace(/[^\d]/g, ''),
            email: document.getElementById('editEmail').value,
            telefone: document.getElementById('editPhone').value,
            endereco: document.getElementById('editAddress').value,
            etapa_atual: parseInt(document.getElementById('editStage').value),
            updated_at: new Date().toISOString()
        };

        try {
            const result = await this.dbService.updateLead(this.currentEditingLead.id || this.currentEditingLead.cpf, updatedData);
            
            if (result.success) {
                // Atualizar lead local
                Object.assign(this.currentEditingLead, updatedData);
                
                // Atualizar localStorage
                this.updateLocalStorageLead(this.currentEditingLead.id || this.currentEditingLead.cpf, updatedData);
                
                // Recarregar tabela
                this.filterLeads();
                
                // Fechar modal
                this.closeEditModal();
                
                console.log('✅ Lead editado com sucesso');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Erro ao editar lead:', error);
            alert('Erro ao salvar alterações do lead');
        }
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditingLead = null;
    }

    async deleteLead(leadId) {
        if (!confirm('Tem certeza que deseja excluir este lead?')) return;

        try {
            const result = await this.dbService.deleteLead(leadId);
            
            if (result.success) {
                // Remover da lista local
                this.leads = this.leads.filter(lead => 
                    (lead.id || lead.cpf) !== leadId
                );
                
                // Remover do localStorage
                this.removeFromLocalStorage(leadId);
                
                // Recarregar tabela
                this.filterLeads();
                this.updateLeadsCount();
                
                console.log('✅ Lead excluído com sucesso');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Erro ao excluir lead:', error);
            alert('Erro ao excluir lead');
        }
    }

    // Ações em massa
    async nextAllLeads() {
        if (!confirm('Avançar todos os leads para a próxima etapa?')) return;

        for (const lead of this.filteredLeads) {
            const currentStage = lead.etapa_atual || 1;
            if (currentStage < 11) {
                await this.updateLeadStage(lead.id || lead.cpf, currentStage + 1);
            }
        }
        
        console.log('✅ Todos os leads avançados');
    }

    async prevAllLeads() {
        if (!confirm('Voltar todos os leads para a etapa anterior?')) return;

        for (const lead of this.filteredLeads) {
            const currentStage = lead.etapa_atual || 1;
            if (currentStage > 1) {
                await this.updateLeadStage(lead.id || lead.cpf, currentStage - 1);
            }
        }
        
        console.log('✅ Todos os leads voltaram uma etapa');
    }

    async clearAllLeads() {
        if (!confirm('ATENÇÃO: Isso irá excluir TODOS os leads. Tem certeza?')) return;
        if (!confirm('Esta ação é IRREVERSÍVEL. Confirma a exclusão de todos os leads?')) return;

        try {
            // Excluir do banco
            for (const lead of this.leads) {
                await this.dbService.deleteLead(lead.id || lead.cpf);
            }
            
            // Limpar localStorage
            localStorage.removeItem('leads');
            
            // Limpar listas
            this.leads = [];
            this.filteredLeads = [];
            
            // Recarregar interface
            this.filterLeads();
            this.updateLeadsCount();
            
            console.log('✅ Todos os leads foram excluídos');
        } catch (error) {
            console.error('❌ Erro ao limpar leads:', error);
            alert('Erro ao excluir todos os leads');
        }
    }

    // Sistema automático
    setSystemMode(mode) {
        this.systemMode = mode;
        const statusIndicator = document.getElementById('systemStatus');
        
        if (mode === 'auto') {
            this.startAutoMode();
            if (statusIndicator) {
                statusIndicator.innerHTML = '<i class="fas fa-robot"></i> Modo Automático';
                statusIndicator.className = 'status-indicator auto';
            }
        } else {
            this.stopAutoMode();
            if (statusIndicator) {
                statusIndicator.innerHTML = '<i class="fas fa-hand-paper"></i> Modo Manual';
                statusIndicator.className = 'status-indicator manual';
            }
        }
        
        console.log(`🔧 Sistema alterado para modo: ${mode}`);
    }

    initializeAutoMode() {
        if (this.systemMode === 'auto') {
            this.startAutoMode();
        }
    }

    startAutoMode() {
        this.stopAutoMode(); // Limpar interval anterior
        
        // Atualizar leads automaticamente a cada 2 horas
        this.autoUpdateInterval = setInterval(() => {
            this.autoUpdateLeads();
        }, 2 * 60 * 60 * 1000); // 2 horas
        
        console.log('🤖 Modo automático iniciado - atualizações a cada 2 horas');
    }

    stopAutoMode() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
        
        console.log('⏹️ Modo automático parado');
    }

    async autoUpdateLeads() {
        console.log('🤖 Executando atualização automática de leads...');
        
        for (const lead of this.leads) {
            const currentStage = lead.etapa_atual || 1;
            
            // Só atualizar se não estiver na última etapa
            if (currentStage < 11) {
                await this.updateLeadStage(lead.id || lead.cpf, currentStage + 1);
                
                // Delay entre atualizações para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('✅ Atualização automática concluída');
    }

    // Helpers
    findLeadById(leadId) {
        return this.leads.find(lead => 
            (lead.id || lead.cpf) === leadId
        );
    }

    updateLocalStorageLead(leadId, updatedData) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const leadIndex = leads.findIndex(lead => 
                (lead.id || lead.cpf) === leadId
            );
            
            if (leadIndex !== -1) {
                Object.assign(leads[leadIndex], updatedData);
                leads[leadIndex].updated_at = new Date().toISOString();
                localStorage.setItem('leads', JSON.stringify(leads));
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar localStorage:', error);
        }
    }

    removeFromLocalStorage(leadId) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const filteredLeads = leads.filter(lead => 
                (lead.id || lead.cpf) !== leadId
            );
            localStorage.setItem('leads', JSON.stringify(filteredLeads));
        } catch (error) {
            console.error('❌ Erro ao remover do localStorage:', error);
        }
    }

    logout() {
        localStorage.removeItem('admin_logged_in');
        this.stopAutoMode();
        
        // Voltar para tela de login
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        
        // Limpar campos
        document.getElementById('passwordInput').value = '';
        document.getElementById('errorMessage').style.display = 'none';
        
        console.log('👋 Logout realizado');
    }
}

// Extensão do DatabaseService para operações administrativas
class AdminDatabaseService extends DatabaseService {
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
                console.error('Erro ao buscar todos os leads:', error);
                return this.getAllLeadsFallback();
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erro na busca de leads:', error);
            return this.getAllLeadsFallback();
        }
    }

    getAllLeadsFallback() {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            return { success: true, data: leads };
        } catch (error) {
            console.error('Erro no fallback de busca:', error);
            return { success: false, error: error.message };
        }
    }

    async updateLead(leadId, updatedData) {
        if (!this.isConfigured) {
            return this.updateLeadFallback(leadId, updatedData);
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .update(updatedData)
                .eq('id', leadId)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar lead:', error);
                return this.updateLeadFallback(leadId, updatedData);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erro na atualização do lead:', error);
            return this.updateLeadFallback(leadId, updatedData);
        }
    }

    updateLeadFallback(leadId, updatedData) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const leadIndex = leads.findIndex(l => (l.id || l.cpf) === leadId);
            
            if (leadIndex !== -1) {
                Object.assign(leads[leadIndex], updatedData);
                leads[leadIndex].updated_at = new Date().toISOString();
                localStorage.setItem('leads', JSON.stringify(leads));
                return { success: true, data: leads[leadIndex] };
            }
            
            return { success: false, error: 'Lead não encontrado' };
        } catch (error) {
            console.error('Erro no fallback de atualização:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteLead(leadId) {
        if (!this.isConfigured) {
            return this.deleteLeadFallback(leadId);
        }

        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId);

            if (error) {
                console.error('Erro ao excluir lead:', error);
                return this.deleteLeadFallback(leadId);
            }

            return { success: true };
        } catch (error) {
            console.error('Erro na exclusão do lead:', error);
            return this.deleteLeadFallback(leadId);
        }
    }

    deleteLeadFallback(leadId) {
        try {
            const leads = JSON.parse(localStorage.getItem('leads') || '[]');
            const filteredLeads = leads.filter(l => (l.id || l.cpf) !== leadId);
            localStorage.setItem('leads', JSON.stringify(filteredLeads));
            return { success: true };
        } catch (error) {
            console.error('Erro no fallback de exclusão:', error);
            return { success: false, error: error.message };
        }
    }
}

// Inicializar painel quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Substituir DatabaseService por versão administrativa
    window.adminPanel = new AdminPanel();
    window.adminPanel.dbService = new AdminDatabaseService();
});

// Expor globalmente para uso nos botões
window.adminPanel = null;