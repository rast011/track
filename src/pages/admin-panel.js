/**
 * Painel Administrativo K7 - Logix Express
 * Sistema completo de gerenciamento de leads
 */
import { supabase } from '../config/supabase.js';
import { DatabaseService } from '../services/database.js';
import { CPFValidator } from '../utils/cpf-validator.js';

class AdminPanel {
    constructor() {
        this.dbService = new AdminDatabaseService();
        this.leads = [];
        this.filteredLeads = [];
        this.currentEditingLead = null;
        this.systemMode = 'auto'; // 'auto' ou 'manual'
        this.autoUpdateInterval = null;
        this.searchTerm = '';
        this.dateFilter = '';
        this.stageFilter = '';
        this.currentView = 'leads'; // 'leads', 'addLead', 'bulkAdd'
        this.currentPage = 1;
        this.leadsPerPage = 50;
        
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
        
        // Mostrar view inicial
        this.showView('leads');
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
        
        // Navegação entre views
        this.setupViewNavigation();
        
        // Formulários
        this.setupForms();
        
        // Seleção em massa
        this.setupMassSelection();
        
        // Filtros por etapa
        this.setupStageFilters();
        
        // Bulk import handlers
        this.setupBulkImportHandlers();
        
        // Setup filter button
        this.setupFilterButton();
    }
    
    setupViewNavigation() {
        const showLeadsBtn = document.getElementById('showLeadsView');
        const showAddLeadBtn = document.getElementById('showAddLeadView');
        const showBulkAddBtn = document.getElementById('showBulkAddView');
        
        if (showLeadsBtn) {
            showLeadsBtn.addEventListener('click', () => this.showView('leads'));
        }
        
        if (showAddLeadBtn) {
            showAddLeadBtn.addEventListener('click', () => this.showView('addLead'));
        }
        
        if (showBulkAddBtn) {
            showBulkAddBtn.addEventListener('click', () => this.showView('bulkAdd'));
        }
    }
    
    setupForms() {
        // Formulário de lead individual
        const addLeadForm = document.getElementById('addLeadForm');
        if (addLeadForm) {
            addLeadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddLead();
            });
        }
        
        // Formulário de leads em massa
        const bulkAddForm = document.getElementById('bulkAddForm');
        if (bulkAddForm) {
            bulkAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBulkAdd();
            });
        }
        
        // Configurar tabela de importação
        this.setupBulkImportTable();
        
        // Máscara de CPF
        const cpfInput = document.getElementById('addLeadCPF');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                CPFValidator.applyCPFMask(e.target);
            });
        }
    }
    
    setupBulkImportHandlers() {
        const previewButton = document.getElementById('previewBulkDataButton');
        const clearButton = document.getElementById('clearBulkDataButton');
        const editButton = document.getElementById('editBulkDataButton');
        const confirmButton = document.getElementById('confirmBulkImportButton');
        const textarea = document.getElementById('bulkDataTextarea');

        if (previewButton) {
            previewButton.addEventListener('click', () => {
                this.previewBulkData();
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearBulkData();
            });
        }

        if (editButton) {
            editButton.addEventListener('click', () => {
                this.editBulkData();
            });
        }

        if (confirmButton) {
            confirmButton.addEventListener('click', () => {
                this.confirmBulkImport();
            });
        }

        // Auto-resize textarea
        if (textarea) {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
            });
        }
    }

    previewBulkData() {
        const textarea = document.getElementById('bulkDataTextarea');
        const previewSection = document.getElementById('bulkPreviewSection');
        const previewContainer = document.getElementById('bulkPreviewContainer');
        const confirmButton = document.getElementById('confirmBulkImportButton');
        const previewSummary = document.getElementById('previewSummary');

        if (!textarea || !textarea.value.trim()) {
            alert('Por favor, cole os dados na caixa de texto primeiro.');
            return;
        }

        try {
            const parsedData = this.parseBulkData(textarea.value);
            
            if (parsedData.length === 0) {
                alert('Nenhum dado válido encontrado. Verifique o formato dos dados.');
                return;
            }

            // Show preview section
            previewSection.style.display = 'block';
            
            // Generate preview table
            const previewTable = this.generatePreviewTable(parsedData);
            previewContainer.innerHTML = previewTable;
            
            // Show confirm button
            confirmButton.style.display = 'inline-flex';
            
            // Update summary
            const validCount = parsedData.filter(row => row.isValid).length;
            const invalidCount = parsedData.length - validCount;
            previewSummary.innerHTML = `
                <i class="fas fa-info-circle"></i> 
                ${validCount} registros válidos, ${invalidCount} com erros
            `;
            
            // Store parsed data for later use
            this.bulkParsedData = parsedData;
            
            // Scroll to preview
            previewSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Erro ao processar dados:', error);
            alert('Erro ao processar os dados. Verifique o formato e tente novamente.');
        }
    }

    parseBulkData(rawData) {
        const lines = rawData.trim().split('\n');
        const parsedData = [];
        
        lines.forEach((line, index) => {
            if (!line.trim()) return; // Skip empty lines
            
            // Split by tab first, then by multiple spaces if no tabs
            let fields = line.split('\t');
            if (fields.length === 1) {
                fields = line.split(/\s{2,}/); // Split by 2 or more spaces
            }
            
            // If still only one field, try single space (less reliable)
            if (fields.length === 1) {
                fields = line.split(' ');
            }
            
            // Expected order: Nome, Email, Telefone, CPF, Produto, Valor, Rua, Número, Complemento, Bairro, CEP, Cidade, Estado, País
            const rowData = {
                lineNumber: index + 1,
                nome_completo: (fields[0] || '').trim(),
                email: (fields[1] || '').trim(),
                telefone: (fields[2] || '').trim(),
                cpf: (fields[3] || '').trim().replace(/[^\d]/g, ''),
                produto: (fields[4] || 'Kit 12 caixas organizadoras + brinde').trim(),
                valor_total: this.parseValue(fields[5]),
                endereco_rua: (fields[6] || '').trim(),
                endereco_numero: (fields[7] || '').trim(),
                endereco_complemento: (fields[8] || '').trim(),
                endereco_bairro: (fields[9] || '').trim(),
                endereco_cep: (fields[10] || '').trim().replace(/[^\d]/g, ''),
                endereco_cidade: (fields[11] || '').trim(),
                endereco_estado: (fields[12] || '').trim(),
                endereco_pais: (fields[13] || 'BR').trim(),
                isValid: false,
                errors: []
            };
            
            // Validate required fields
            if (!rowData.nome_completo) rowData.errors.push('Nome obrigatório');
            if (!rowData.email || !this.isValidEmail(rowData.email)) rowData.errors.push('Email inválido');
            if (!rowData.telefone) rowData.errors.push('Telefone obrigatório');
            if (!rowData.cpf || rowData.cpf.length !== 11) rowData.errors.push('CPF inválido');
            
            rowData.isValid = rowData.errors.length === 0;
            
            // Format full address
            const addressParts = [
                rowData.endereco_rua,
                rowData.endereco_numero,
                rowData.endereco_complemento,
                rowData.endereco_bairro,
                rowData.endereco_cep,
                rowData.endereco_cidade,
                rowData.endereco_estado,
                rowData.endereco_pais
            ].filter(part => part);
            
            rowData.endereco = addressParts.join(', ');
            
            parsedData.push(rowData);
        });
        
        return parsedData;
    }

    parseValue(valueStr) {
        if (!valueStr) return 0;
        
        // Remove currency symbols and convert comma to dot
        const cleanValue = valueStr.toString()
            .replace(/[R$\s]/g, '')
            .replace(',', '.');
        
        const parsed = parseFloat(cleanValue);
        return isNaN(parsed) ? 0 : parsed;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    generatePreviewTable(parsedData) {
        const validData = parsedData.filter(row => row.isValid);
        const invalidData = parsedData.filter(row => !row.isValid);
        
        let html = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #345C7A; color: white; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 8px; border: 1px solid #ddd;">Nome Completo</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">E-mail</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Telefone</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">CPF</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Produto</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Valor</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Endereço Completo</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Add valid rows
        validData.forEach(row => {
            html += `
                <tr style="background: #f8fff8;">
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.nome_completo}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.email}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${this.formatPhone(row.telefone)}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${this.formatCPF(row.cpf)}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.produto}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">R$ ${row.valor_total.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; max-width: 200px; word-wrap: break-word;">${row.endereco}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; color: #27ae60;">✅ Válido</td>
                </tr>
            `;
        });
        
        // Add invalid rows
        invalidData.forEach(row => {
            html += `
                <tr style="background: #fff8f8;">
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.nome_completo}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.email}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.telefone}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.cpf}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.produto}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">R$ ${row.valor_total.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${row.endereco}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; color: #e74c3c;">❌ ${row.errors.join(', ')}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }

    formatPhone(phone) {
        if (!phone) return '';
        
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
            // Already has country code
            return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 4)} ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
        } else if (cleanPhone.length === 11) {
            // Add country code
            return `+55 ${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
        }
        
        return phone;
    }

    formatCPF(cpf) {
        if (!cpf || cpf.length !== 11) return cpf;
        return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
    }

    clearBulkData() {
        const textarea = document.getElementById('bulkDataTextarea');
        const previewSection = document.getElementById('bulkPreviewSection');
        const resultsSection = document.getElementById('bulkResultsSection');
        
        if (textarea) textarea.value = '';
        if (previewSection) previewSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        
        this.bulkParsedData = null;
    }

    editBulkData() {
        const previewSection = document.getElementById('bulkPreviewSection');
        if (previewSection) {
            previewSection.style.display = 'none';
        }
        
        // Focus back on textarea
        const textarea = document.getElementById('bulkDataTextarea');
        if (textarea) {
            textarea.focus();
        }
    }

    // Método para obter nome da etapa baseado no número
    getStageNameByNumber(stageNumber) {
        const stageNames = {
            1: 'Pedido criado',
            2: 'Preparando para envio',
            3: 'Vendedor enviou pedido',
            4: 'Centro triagem Shenzhen',
            5: 'Centro logístico Shenzhen',
            6: 'Trânsito internacional',
            7: 'Liberado exportação',
            8: 'Saiu origem Shenzhen',
            9: 'Chegou no Brasil',
            10: 'Trânsito Curitiba/PR',
            11: 'Alfândega importação - Aguardando pagamento (1ª tentativa)',
            12: 'Alfândega importação - Aguardando pagamento (2ª tentativa)',
            13: 'Liberado alfândega',
            14: 'Sairá para entrega',
            15: 'Em trânsito entrega',
            16: 'Rota de entrega',
            17: '1ª tentativa entrega - Aguardando pagamento',
            18: '2ª tentativa entrega - Aguardando pagamento',
            19: '3ª tentativa entrega - Aguardando pagamento',
            20: 'Entregue'
        };
        return stageNames[stageNumber] || `Etapa ${stageNumber}`;
    }

    // Método para obter status de pagamento baseado na etapa
    getPaymentStatusByStage(stageNumber) {
        if (stageNumber === 11) return 'Aguardando pagamento da taxa alfandegária - 1ª tentativa';
        if (stageNumber === 12) return 'Aguardando pagamento da taxa alfandegária - 2ª tentativa';
        if (stageNumber >= 13 && stageNumber <= 16) return 'Taxa alfandegária paga';
        if (stageNumber === 17) return '1ª tentativa de entrega - Aguardando pagamento';
        if (stageNumber === 18) return '2ª tentativa de entrega - Aguardando pagamento';
        if (stageNumber === 19) return '3ª tentativa de entrega - Aguardando pagamento';
        if (stageNumber >= 20) return 'Todas as taxas pagas - Entregue';
        return 'Em processamento';
    }

    async confirmBulkImport() {
        if (!this.bulkParsedData) {
            alert('Nenhum dado para importar.');
            return;
        }

        const validData = this.bulkParsedData.filter(row => row.isValid);
        
        if (validData.length === 0) {
            alert('Nenhum registro válido para importar.');
            return;
        }

        const confirmButton = document.getElementById('confirmBulkImportButton');
        const originalText = confirmButton.innerHTML;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
        confirmButton.disabled = true;

        try {
            const results = {
                success: 0,
                duplicates: 0,
                errors: 0,
                duplicateList: []
            };

            for (const row of validData) {
                try {
                    // Check for duplicate CPF
                    const existingLead = await this.dbService.getLeadByCPF(row.cpf);
                    
                    if (existingLead.success && existingLead.data) {
                        results.duplicates++;
                        results.duplicateList.push({
                            nome: row.nome_completo,
                            cpf: row.cpf,
                            motivo: 'CPF já existe'
                        });
                        continue;
                    }

                    // Create lead data
                    const leadData = {
                        nome_completo: row.nome_completo,
                        cpf: row.cpf,
                        email: row.email,
                        telefone: row.telefone,
                        endereco: row.endereco,
                        produtos: [{
                            nome: row.produto,
                            preco: row.valor_total
                        }],
                        valor_total: row.valor_total,
                        meio_pagamento: 'PIX',
                        origem: 'admin_import',
                        etapa_atual: 1,
                        status_pagamento: 'pendente'
                    };

                    const result = await this.dbService.createLead(leadData);
                    
                    if (result.success) {
                        results.success++;
                    } else {
                        results.errors++;
                    }
                    
                } catch (error) {
                    console.error('Erro ao importar lead:', error);
                    results.errors++;
                }
            }

            // Show results
            this.showBulkImportResults(results);
            
            // Refresh leads list
            await this.loadLeads();
            
        } catch (error) {
            console.error('Erro na importação em massa:', error);
            alert('Erro durante a importação. Tente novamente.');
        } finally {
            confirmButton.innerHTML = originalText;
            confirmButton.disabled = false;
        }
    }

    showBulkImportResults(results) {
        const resultsSection = document.getElementById('bulkResultsSection');
        const resultsContainer = document.getElementById('bulkResultsContainer');
        
        let html = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60;">
                <h5 style="color: #27ae60; margin-bottom: 15px;">
                    <i class="fas fa-check-circle"></i> Importação Concluída
                </h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #d4edda; padding: 15px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #155724;">${results.success}</div>
                        <div style="color: #155724;">✅ Pedidos inseridos com sucesso</div>
                    </div>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #856404;">${results.duplicates}</div>
                        <div style="color: #856404;">❌ Pedidos ignorados por duplicidade</div>
                    </div>
                    ${results.errors > 0 ? `
                    <div style="background: #f8d7da; padding: 15px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #721c24;">${results.errors}</div>
                        <div style="color: #721c24;">⚠️ Erros durante importação</div>
                    </div>
                    ` : ''}
                </div>
        `;
        
        if (results.duplicateList.length > 0) {
            html += `
                <h6 style="color: #856404; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Lista de Duplicidades:
                </h6>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background: #856404; color: white;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd;">Nome</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">CPF</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            results.duplicateList.forEach(duplicate => {
                html += `
                    <tr style="background: #fff3cd;">
                        <td style="padding: 6px; border: 1px solid #ddd;">${duplicate.nome}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${this.formatCPF(duplicate.cpf)}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${duplicate.motivo}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        html += `</div>`;
        
        resultsContainer.innerHTML = html;
        resultsSection.style.display = 'block';
        
        // Clear preview and textarea
        this.clearBulkData();
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    setupBulkImportTable() {
        const tableBody = document.getElementById('bulkImportTableBody');
        if (!tableBody) return;
        
        // Adicionar 10 linhas vazias inicialmente
        for (let i = 0; i < 10; i++) {
            this.addBulkImportRow();
        }
        
        // Botão para adicionar mais linhas
        const addRowButton = document.getElementById('addBulkRowButton');
        if (addRowButton) {
            addRowButton.addEventListener('click', () => {
                this.addBulkImportRow();
            });
        }
        
        // Botão para limpar tabela
        const clearTableButton = document.getElementById('clearBulkTableButton');
        if (clearTableButton) {
            clearTableButton.addEventListener('click', () => {
                this.clearBulkImportTable();
            });
        }
    }
    
    addBulkImportRow() {
        const tableBody = document.getElementById('bulkImportTableBody');
        if (!tableBody) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="bulk-input" placeholder="Nome completo" required></td>
            <td><input type="email" class="bulk-input" placeholder="email@exemplo.com" required></td>
            <td><input type="text" class="bulk-input" placeholder="(11) 99999-9999" required></td>
            <td><input type="text" class="bulk-input cpf-input" placeholder="000.000.000-00" required maxlength="14"></td>
            <td><input type="text" class="bulk-input" placeholder="Nome do produto"></td>
            <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01"></td>
            <td><input type="text" class="bulk-input" placeholder="Rua/Avenida"></td>
            <td><input type="text" class="bulk-input" placeholder="123"></td>
            <td><input type="text" class="bulk-input" placeholder="Apto 1"></td>
            <td><input type="text" class="bulk-input" placeholder="Centro"></td>
            <td><input type="text" class="bulk-input" placeholder="00000-000"></td>
            <td><input type="text" class="bulk-input" placeholder="São Paulo"></td>
            <td><input type="text" class="bulk-input" placeholder="SP" maxlength="2"></td>
            <td><input type="text" class="bulk-input" placeholder="BR" maxlength="2"></td>
            <td>
                <button type="button" class="action-button delete" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Aplicar máscara de CPF nos novos campos
        const cpfInput = row.querySelector('.cpf-input');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                CPFValidator.applyCPFMask(e.target);
            });
        }
    }
    
    clearBulkImportTable() {
        const tableBody = document.getElementById('bulkImportTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            // Adicionar 10 linhas vazias novamente
            for (let i = 0; i < 10; i++) {
                this.addBulkImportRow();
            }
        }
    }
    
    showView(viewName) {
        this.currentView = viewName;
        
        // Ocultar todas as views
        document.querySelectorAll('.admin-view').forEach(view => {
            view.style.display = 'none';
        });
        
        // Mostrar view selecionada
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.style.display = 'block';
        }
        
        // Atualizar botões de navegação
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`show${viewName.charAt(0).toUpperCase() + viewName.slice(1)}View`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        console.log(`📄 Exibindo view: ${viewName}`);
    }
    
    async handleAddLead() {
        const formData = this.getAddLeadFormData();
        
        if (!this.validateLeadData(formData)) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }
        
        try {
            const leadData = this.formatLeadData(formData);
            const result = await this.dbService.createLead(leadData);
            
            if (result.success) {
                console.log('✅ Lead criado com sucesso');
                this.clearAddLeadForm();
                this.loadLeads();
                this.showView('leads');
                alert('Lead criado com sucesso!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Erro ao criar lead:', error);
            alert('Erro ao criar lead: ' + error.message);
        }
    }
    
    async handleBulkAdd() {
        const tableBody = document.getElementById('bulkImportTableBody');
        if (!tableBody) {
            alert('Tabela de importação não encontrada');
            return;
        }
        
        const rows = tableBody.querySelectorAll('tr');
        const leads = [];
        let validRowCount = 0;
        
        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('.bulk-input');
            if (inputs.length < 14) return;
            
            // Verificar se pelo menos os campos obrigatórios estão preenchidos
            const nome = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const telefone = inputs[2].value.trim();
            const cpf = inputs[3].value.trim();
            
            if (!nome || !email || !telefone || !cpf) {
                // Pular linhas vazias ou incompletas
                return;
            }
            
            validRowCount++;
            
            const leadData = this.formatBulkLeadData({
                nome: nome,
                email: email,
                telefone: telefone,
                cpf: cpf,
                produto: inputs[4].value.trim() || 'Kit 12 caixas organizadoras + brinde',
                valor: parseFloat(inputs[5].value) || 67.90,
                endereco: inputs[6].value.trim(),
                numero: inputs[7].value.trim(),
                complemento: inputs[8].value.trim(),
                bairro: inputs[9].value.trim(),
                cep: inputs[10].value.trim(),
                cidade: inputs[11].value.trim(),
                estado: inputs[12].value.trim(),
                pais: inputs[13].value.trim() || 'BR'
            });
            
            if (leadData) {
                leads.push(leadData);
            }
        });
        
        if (leads.length === 0) {
            alert('Nenhum lead válido encontrado. Verifique se os campos obrigatórios (Nome, Email, Telefone, CPF) estão preenchidos.');
            return;
        }
        
        if (!confirm(`Importar ${leads.length} leads? Esta ação não pode ser desfeita.`)) {
            return;
        }
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const leadData of leads) {
                const result = await this.dbService.createLead(leadData);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error('Erro ao criar lead:', result.error);
                }
                
                // Pequeno delay para não sobrecarregar o banco
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`✅ ${successCount} leads criados em massa`);
            this.clearBulkImportTable();
            this.loadLeads();
            this.showView('leads');
            
            if (errorCount > 0) {
                alert(`${successCount} leads criados com sucesso!\n${errorCount} leads falharam (possível duplicação de CPF).`);
            } else {
                alert(`${successCount} leads criados com sucesso!`);
            }
        } catch (error) {
            console.error('❌ Erro na criação em massa:', error);
            alert('Erro na criação em massa: ' + error.message);
        }
    }
    
    formatBulkLeadData(formData) {
        try {
            const enderecoCompleto = this.formatCompleteAddress(formData);
            
            return {
                nome_completo: formData.nome,
                cpf: formData.cpf.replace(/[^\d]/g, ''),
                email: formData.email,
                telefone: formData.telefone,
                endereco: enderecoCompleto,
                produtos: [{
                    nome: formData.produto,
                    preco: parseFloat(formData.valor),
                    imagem: '/traduza-have-you-propose copy.png'
                }],
                valor_total: parseFloat(formData.valor),
                meio_pagamento: 'PIX',
                origem: 'direto',
                origem: 'direto',
                etapa_atual: 1,
                status_pagamento: 'pendente',
                data_compra: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erro ao formatar dados do lead:', error);
            return null;
        }
    }
    
    formatCompleteAddress(formData) {
        const parts = [];
        
        if (formData.endereco) parts.push(formData.endereco);
        if (formData.numero) parts.push(formData.numero);
        if (formData.complemento) parts.push(formData.complemento);
        if (formData.bairro) parts.push(formData.bairro);
        if (formData.cep) parts.push(formData.cep);
        if (formData.cidade && formData.estado) {
            parts.push(`${formData.cidade}/${formData.estado}`);
        }
        if (formData.pais) parts.push(formData.pais);
        
        return parts.join(', ');
    }
    
    getAddLeadFormData() {
        return {
            nome: document.getElementById('addLeadNome').value,
            email: document.getElementById('addLeadEmail').value,
            telefone: document.getElementById('addLeadTelefone').value,
            cpf: document.getElementById('addLeadCPF').value,
            produto: document.getElementById('addLeadProduto').value,
            valor: document.getElementById('addLeadValor').value,
            endereco: document.getElementById('addLeadEndereco').value,
            numero: document.getElementById('addLeadNumero').value,
            complemento: document.getElementById('addLeadComplemento').value,
            bairro: document.getElementById('addLeadBairro').value,
            cep: document.getElementById('addLeadCEP').value,
            cidade: document.getElementById('addLeadCidade').value,
            estado: document.getElementById('addLeadEstado').value,
            pais: document.getElementById('addLeadPais').value
        };
    }
    
    parseBulkLine(parts) {
        try {
            return {
                nome: parts[0] + ' ' + parts[1] + ' ' + parts[2], // Assumindo 3 nomes
                email: parts[3],
                telefone: parts[4],
                cpf: parts[5],
                produto: parts.slice(6, -8).join(' '), // Produto pode ter múltiplas palavras
                valor: parseFloat(parts[parts.length - 8].replace(',', '.')),
                endereco: parts[parts.length - 7],
                numero: parts[parts.length - 6],
                complemento: parts[parts.length - 5],
                bairro: parts[parts.length - 4],
                cep: parts[parts.length - 3],
                cidade: parts[parts.length - 2],
                estado: parts[parts.length - 1],
                pais: 'BR'
            };
        } catch (error) {
            console.error('❌ Erro ao processar linha:', error);
            return null;
        }
    }
    
    validateLeadData(data) {
        return data.nome && data.cpf && data.produto && data.valor;
    }
    
    formatLeadData(formData) {
        const enderecoCompleto = `${formData.endereco}, ${formData.numero}, ${formData.complemento}, ${formData.bairro}, ${formData.cep}, ${formData.cidade}/${formData.estado}-${formData.pais}`;
        
        return {
            nome_completo: formData.nome,
            cpf: formData.cpf.replace(/[^\d]/g, ''),
            email: formData.email,
            telefone: formData.telefone,
            endereco: enderecoCompleto,
            produtos: [{
                nome: formData.produto,
                preco: parseFloat(formData.valor),
                imagem: '/traduza-have-you-propose copy.png'
            }],
            valor_total: parseFloat(formData.valor),
            meio_pagamento: 'PIX',
            origem: 'direto',
            etapa_atual: 1,
            status_pagamento: 'pendente',
            data_compra: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    
    clearAddLeadForm() {
        document.getElementById('addLeadForm').reset();
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

    setupFilterButton() {
        const applyFiltersButton = document.getElementById('applyFiltersButton');
        if (applyFiltersButton) {
            applyFiltersButton.addEventListener('click', () => {
                this.applyAllFilters();
            });
        }

        // Add Enter key support to filter inputs
        const filterInputs = [
            document.getElementById('searchInput'),
            document.getElementById('dateFilter'),
            document.getElementById('stageFilter')
        ];

        filterInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.applyAllFilters();
                    }
                });
            }
        });
    }

    applyAllFilters() {
        console.log('🔍 Aplicando todos os filtros...');
        
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const stageFilter = document.getElementById('stageFilter')?.value || 'all';
        
        console.log('Filtros aplicados:', { searchTerm, dateFilter, stageFilter });
        
        let filteredLeads = [...this.leads];
        
        // Aplicar filtro de busca (nome ou CPF)
        if (searchTerm) {
            filteredLeads = filteredLeads.filter(lead => {
                const name = (lead.nome_completo || '').toLowerCase();
                const cpf = (lead.cpf || '').replace(/[^\d]/g, '');
                const searchCpf = searchTerm.replace(/[^\d]/g, '');
                
                return name.includes(searchTerm) || cpf.includes(searchCpf);
            });
        }
        
        // Aplicar filtro de data
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filteredLeads = filteredLeads.filter(lead => {
                if (!lead.created_at) return false;
                const leadDate = new Date(lead.created_at);
                return leadDate.toDateString() === filterDate.toDateString();
            });
        }
        
        // Aplicar filtro de etapa
        if (stageFilter !== 'all') {
            const targetStage = parseInt(stageFilter);
            filteredLeads = filteredLeads.filter(lead => {
                return lead.etapa_atual === targetStage;
            });
        }
        
        console.log(`📊 Filtros aplicados: ${filteredLeads.length} de ${this.leads.length} leads`);
        
        // Atualizar exibição
        this.displayLeads(filteredLeads);
        this.updateLeadsCount(filteredLeads.length);
        
        // Mostrar feedback visual
        this.showFilterFeedback(filteredLeads.length, this.leads.length);
    }

    showFilterFeedback(filteredCount, totalCount) {
        const button = document.getElementById('applyFiltersButton');
        if (!button) return;
        
        const originalText = button.innerHTML;
        
        if (filteredCount === totalCount) {
            button.innerHTML = '<i class="fas fa-check"></i> Todos os leads';
            button.style.background = '#27ae60';
        } else {
            button.innerHTML = `<i class="fas fa-filter"></i> ${filteredCount} encontrados`;
            button.style.background = '#3498db';
        }
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }

    setupMassSelection() {
        const selectAllCheckbox = document.getElementById('selectAllLeads');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }
        
        // Botões de ação em massa
        const massActionButtons = {
            'massNextStage': () => this.massNextStage(),
            'massPrevStage': () => this.massPrevStage(),
            'massDeleteLeads': () => this.massDeleteLeads(),
            'massSetStage': () => this.massSetStage()
        };
        
        Object.entries(massActionButtons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.lead-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateMassActionButtons();
    }
    
    updateMassActionButtons() {
        const selectedCount = document.querySelectorAll('.lead-checkbox:checked').length;
        const massActionButtons = document.querySelectorAll('.mass-action-button');
        
        massActionButtons.forEach(button => {
            button.disabled = selectedCount === 0;
            button.style.opacity = selectedCount === 0 ? '0.5' : '1';
        });
        
        const selectedCountDisplay = document.getElementById('selectedCount');
        if (selectedCountDisplay) {
            selectedCountDisplay.textContent = `${selectedCount} selecionados`;
        }
    }
    
    getSelectedLeads() {
        const selectedLeads = [];
        const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
            const leadId = checkbox.dataset.leadId;
            const lead = this.findLeadById(leadId);
            if (lead) {
                selectedLeads.push(lead);
            }
        });
        
        return selectedLeads;
    }
    
    async massNextStage() {
        const selectedLeads = this.getSelectedLeads();
        if (selectedLeads.length === 0) return;
        
        if (!confirm(`Avançar ${selectedLeads.length} leads para a próxima etapa?`)) return;
        
        for (const lead of selectedLeads) {
            const currentStage = lead.etapa_atual || 1;
            if (currentStage < 16) {
                await this.updateLeadStage(lead.id || lead.cpf, currentStage + 1);
            }
        }
        
        this.loadLeads();
        console.log(`✅ ${selectedLeads.length} leads avançados`);
    }
    
    async massPrevStage() {
        const selectedLeads = this.getSelectedLeads();
        if (selectedLeads.length === 0) return;
        
        if (!confirm(`Voltar ${selectedLeads.length} leads para a etapa anterior?`)) return;
        
        for (const lead of selectedLeads) {
            const currentStage = lead.etapa_atual || 1;
            if (currentStage > 1) {
                await this.updateLeadStage(lead.id || lead.cpf, currentStage - 1);
            }
        }
        
        this.loadLeads();
        console.log(`✅ ${selectedLeads.length} leads voltaram uma etapa`);
    }
    
    async massDeleteLeads() {
        const selectedLeads = this.getSelectedLeads();
        if (selectedLeads.length === 0) return;
        
        if (!confirm(`ATENÇÃO: Excluir ${selectedLeads.length} leads selecionados? Esta ação é IRREVERSÍVEL.`)) return;
        
        for (const lead of selectedLeads) {
            await this.deleteLead(lead.id || lead.cpf);
        }
        
        this.loadLeads();
        console.log(`✅ ${selectedLeads.length} leads excluídos`);
    }
    
    async massSetStage() {
        const selectedLeads = this.getSelectedLeads();
        if (selectedLeads.length === 0) return;
        
        const stageNumber = prompt('Digite o número da etapa (1-16):');
        if (!stageNumber || isNaN(stageNumber)) return;
        
        const stage = parseInt(stageNumber);
        if (stage < 1 || stage > 16) {
            alert('Etapa deve estar entre 1 e 16');
            return;
        }
        
        if (!confirm(`Mover ${selectedLeads.length} leads para a etapa ${stage}?`)) return;
        
        for (const lead of selectedLeads) {
            await this.updateLeadStage(lead.id || lead.cpf, stage);
        }
        
        this.loadLeads();
        console.log(`✅ ${selectedLeads.length} leads movidos para etapa ${stage}`);
    }
    
    setupStageFilters() {
        const stageFilterButtons = document.querySelectorAll('.stage-filter-button');
        stageFilterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const stage = e.target.dataset.stage;
                this.filterByStage(stage);
                
                // Atualizar botões ativos
                stageFilterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    filterByStage(stage) {
        this.stageFilter = stage;
        this.currentPage = 1;
        this.filterLeads();
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
            
            // Filtro por etapa
            const matchesStage = !this.stageFilter || this.stageFilter === 'all' ||
                lead.etapa_atual === parseInt(this.stageFilter);

            return matchesSearch && matchesDate && matchesStage;
        });

        this.renderLeadsTable();
        this.setupPagination();
    }

    setupPagination() {
        this.currentPage = 1;
        this.leadsPerPage = 50;
        this.totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
        
        this.renderPaginationControls();
    }
    
    renderPaginationControls() {
        const paginationContainer = document.getElementById('paginationControls');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
        
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Página ${this.currentPage} de ${totalPages} (${this.filteredLeads.length} leads)
            </div>
            <div class="pagination-buttons">
                <button class="control-button" ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminPanel.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                <button class="control-button" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminPanel.goToPage(${this.currentPage + 1})">
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderLeadsTable();
        this.renderPaginationControls();
    }
    
    getPaginatedLeads() {
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        return this.filteredLeads.slice(startIndex, endIndex);
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
        
        // Obter leads da página atual
        const paginatedLeads = this.getPaginatedLeads();

        tableBody.innerHTML = paginatedLeads.map(lead => {
            const createdDate = new Date(lead.created_at).toLocaleDateString('pt-BR');
            const updatedDate = new Date(lead.updated_at).toLocaleString('pt-BR');
            const stageName = this.getStageNameByNumber(lead.etapa_atual || 1);
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="lead-checkbox" data-lead-id="${lead.id || lead.cpf}" onchange="adminPanel.updateMassActionButtons()">
                    </td>
                    <td>${lead.nome_completo || 'Nome não informado'}</td>
                    <td>${CPFValidator.formatCPF(lead.cpf || '')}</td>
                    <td>${lead.email || 'N/A'}</td>
                    <td>${lead.telefone || 'N/A'}</td>
                    <td>${lead.produtos?.[0]?.nome || 'Produto não informado'}</td>
                    <td>R$ ${(lead.valor_total || 0).toFixed(2)}</td>
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
        
        this.renderPaginationControls();
        this.updateMassActionButtons();
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
            // Buscar o lead primeiro para obter o ID correto
            const lead = this.findLeadById(leadId);
            if (!lead) {
                throw new Error('Lead não encontrado');
            }
            
            // Usar CPF para atualização se não tiver ID
            const identifier = lead.id || lead.cpf;
            const result = await this.dbService.updateLeadStage(identifier, newStage);
            
            if (result.success) {
                // Atualizar lead local
                lead.etapa_atual = newStage;
                lead.updated_at = new Date().toISOString();
                
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
    window.adminPanel = new AdminPanel();
});

// Expor globalmente para uso nos botões
window.adminPanel = null;