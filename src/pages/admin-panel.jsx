/**
 * Painel Administrativo - Sistema de Gerenciamento de Leads
 */
import { DatabaseService } from '../services/database.js';
import { CPFValidator } from '../utils/cpf-validator.js';

class AdminPanel {
    constructor() {
        this.dbService = new DatabaseService();
        this.leads = [];
        this.filteredLeads = [];
        this.selectedLeads = new Set();
        this.currentPage = 1;
        this.leadsPerPage = 20;
        this.isLoggedIn = false;
        this.systemMode = 'auto';
        this.bulkData = [];
        this.bulkResults = null;
        
        console.log('🔧 AdminPanel inicializado');
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando painel administrativo...');
        
        try {
            this.setupEventListeners();
            this.checkLoginStatus();
            
            if (this.isLoggedIn) {
                await this.loadLeads();
                this.renderLeadsTable();
                this.updateLeadsCount();
            }
            
            console.log('✅ Painel administrativo inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização do painel:', error);
        }
    }

    setupEventListeners() {
        // Login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Navigation
        const showLeadsView = document.getElementById('showLeadsView');
        if (showLeadsView) {
            showLeadsView.addEventListener('click', () => this.showView('leadsView'));
        }

        const showAddLeadView = document.getElementById('showAddLeadView');
        if (showAddLeadView) {
            showAddLeadView.addEventListener('click', () => this.showView('addLeadView'));
        }

        const showBulkAddView = document.getElementById('showBulkAddView');
        if (showBulkAddView) {
            showBulkAddView.addEventListener('click', () => this.showView('bulkAddView'));
        }

        // Add Lead Form
        const addLeadForm = document.getElementById('addLeadForm');
        if (addLeadForm) {
            addLeadForm.addEventListener('submit', (e) => this.handleAddLead(e));
        }

        // Bulk Import
        const previewButton = document.getElementById('previewBulkDataButton');
        if (previewButton) {
            previewButton.addEventListener('click', () => this.previewBulkData());
        }

        const clearButton = document.getElementById('clearBulkDataButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearBulkData());
        }

        const confirmButton = document.getElementById('confirmBulkImportButton');
        if (confirmButton) {
            confirmButton.addEventListener('click', () => this.confirmBulkImport());
        }

        const editButton = document.getElementById('editBulkDataButton');
        if (editButton) {
            editButton.addEventListener('click', () => this.editBulkData());
        }

        // Controls
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshLeads());
        }

        const applyFiltersButton = document.getElementById('applyFiltersButton');
        if (applyFiltersButton) {
            applyFiltersButton.addEventListener('click', () => this.applyFilters());
        }

        // Mass Actions
        const massNextStage = document.getElementById('massNextStage');
        if (massNextStage) {
            massNextStage.addEventListener('click', () => this.handleMassAction('nextStage'));
        }

        const massPrevStage = document.getElementById('massPrevStage');
        if (massPrevStage) {
            massPrevStage.addEventListener('click', () => this.handleMassAction('prevStage'));
        }

        const massSetStage = document.getElementById('massSetStage');
        if (massSetStage) {
            massSetStage.addEventListener('click', () => this.handleMassAction('setStage'));
        }

        const massDeleteLeads = document.getElementById('massDeleteLeads');
        if (massDeleteLeads) {
            massDeleteLeads.addEventListener('click', () => this.handleMassAction('delete'));
        }

        // CPF Mask
        const cpfInputs = document.querySelectorAll('#addLeadCPF, #editCPF');
        cpfInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', (e) => {
                    CPFValidator.applyCPFMask(e.target);
                });
            }
        });
    }

    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
        
        if (isLoggedIn) {
            this.isLoggedIn = true;
            this.showAdminPanel();
        } else {
            this.showLoginScreen();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        
        const passwordInput = document.getElementById('passwordInput');
        const errorMessage = document.getElementById('errorMessage');
        
        if (!passwordInput) return;
        
        const password = passwordInput.value;
        const correctPassword = 'admin123';
        
        if (password === correctPassword) {
            this.isLoggedIn = true;
            localStorage.setItem('admin_logged_in', 'true');
            this.showAdminPanel();
            this.loadLeads();
        } else {
            if (errorMessage) {
                errorMessage.textContent = 'Senha incorreta. Tente novamente.';
                errorMessage.style.display = 'block';
            }
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        localStorage.removeItem('admin_logged_in');
        this.showLoginScreen();
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (adminPanel) adminPanel.style.display = 'none';
    }

    showAdminPanel() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        
        this.showView('leadsView');
    }

    showView(viewId) {
        // Hide all views
        const views = document.querySelectorAll('.admin-view');
        views.forEach(view => {
            view.style.display = 'none';
        });

        // Remove active class from all nav buttons
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.style.display = 'block';
        }

        // Add active class to corresponding nav button
        const activeButton = document.getElementById(`show${viewId.charAt(0).toUpperCase() + viewId.slice(1)}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    async loadLeads() {
        try {
            console.log('📊 Carregando leads...');
            
            const result = await this.dbService.getAllLeads();
            
            if (result.success) {
                this.leads = result.data || [];
            } else {
                console.error('❌ Erro ao carregar leads:', result.error);
                this.leads = [];
            }

            this.filteredLeads = [...this.leads];
            this.renderLeadsTable();
            this.updateLeadsCount();
        } catch (error) {
            console.error('❌ Erro ao carregar leads:', error);
            this.leads = [];
            this.filteredLeads = [];
            this.renderLeadsTable();
            this.updateLeadsCount();
        }
    }

    loadLeadsFromLocalStorage() {
        try {
            const storedLeads = localStorage.getItem('leads');
            this.leads = storedLeads ? JSON.parse(storedLeads) : [];
            console.log(`📦 ${this.leads.length} leads carregados do localStorage`);
        } catch (error) {
            console.error('❌ Erro ao carregar leads do localStorage:', error);
            this.leads = [];
        }
    }

    async handleAddLead(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const leadData = {
            nome_completo: formData.get('nome') || document.getElementById('addLeadNome')?.value,
            cpf: (formData.get('cpf') || document.getElementById('addLeadCPF')?.value)?.replace(/[^\d]/g, ''),
            email: formData.get('email') || document.getElementById('addLeadEmail')?.value,
            telefone: formData.get('telefone') || document.getElementById('addLeadTelefone')?.value,
            endereco: this.buildAddress(formData),
            produtos: [{
                nome: formData.get('produto') || document.getElementById('addLeadProduto')?.value || 'Kit 12 caixas organizadoras + brinde',
                preco: parseFloat(formData.get('valor') || document.getElementById('addLeadValor')?.value || 0)
            }],
            valor_total: parseFloat(formData.get('valor') || document.getElementById('addLeadValor')?.value || 0),
            meio_pagamento: 'PIX',
            origem: 'direto',
            etapa_atual: 1,
            status_pagamento: 'pendente',
            order_bumps: [],
            data_compra: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const result = await this.dbService.createLead(leadData);
            
            if (result.success) {
                console.log('✅ Lead criado com sucesso');
                await this.loadLeads();
                this.showView('leadsView');
                e.target.reset();
                this.showNotification('Lead criado com sucesso!', 'success');
            } else {
                console.error('❌ Erro ao criar lead:', result.error);
                this.showNotification('Erro ao criar lead: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('❌ Erro ao criar lead:', error);
            this.showNotification('Erro ao criar lead', 'error');
        }
    }

    buildAddress(formData) {
        const endereco = formData.get('endereco') || document.getElementById('addLeadEndereco')?.value || '';
        const numero = formData.get('numero') || document.getElementById('addLeadNumero')?.value || '';
        const complemento = formData.get('complemento') || document.getElementById('addLeadComplemento')?.value || '';
        const bairro = formData.get('bairro') || document.getElementById('addLeadBairro')?.value || '';
        const cep = formData.get('cep') || document.getElementById('addLeadCEP')?.value || '';
        const cidade = formData.get('cidade') || document.getElementById('addLeadCidade')?.value || '';
        const estado = formData.get('estado') || document.getElementById('addLeadEstado')?.value || '';
        const pais = formData.get('pais') || document.getElementById('addLeadPais')?.value || 'BR';

        return `${endereco}, ${numero}${complemento ? ` - ${complemento}` : ''} - ${bairro} - ${cidade}/${estado} - CEP: ${cep} - ${pais}`;
    }

    // Bulk Import Methods
    previewBulkData() {
        const textarea = document.getElementById('bulkDataTextarea');
        if (!textarea || !textarea.value.trim()) {
            this.showNotification('Por favor, cole os dados na caixa de texto', 'error');
            return;
        }

        try {
            this.bulkData = this.parseBulkData(textarea.value);
            this.displayBulkPreview();
        } catch (error) {
            console.error('❌ Erro ao processar dados:', error);
            this.showNotification('Erro ao processar dados: ' + error.message, 'error');
        }
    }

    parseBulkData(rawData) {
        const lines = rawData.trim().split('\n').filter(line => line.trim());
        const parsedData = [];
        const seenCPFs = new Set();
        const duplicatesRemoved = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Split by tabs or multiple spaces
            const fields = line.split(/\t+|\s{2,}/).map(field => field.trim());
            
            if (fields.length < 4) {
                console.warn(`Linha ${i + 1} ignorada: poucos campos`);
                continue;
            }

            const [nome, email, telefone, cpf, produto, valor, rua, numero, complemento, bairro, cep, cidade, estado, pais] = fields;
            
            // Clean CPF
            const cleanCPF = (cpf || '').replace(/[^\d]/g, '');
            
            // Check for internal duplicates
            if (seenCPFs.has(cleanCPF)) {
                duplicatesRemoved.push({ nome, cpf: cleanCPF });
                continue;
            }
            
            seenCPFs.add(cleanCPF);

            // Build address
            const endereco = this.buildAddressFromFields({
                rua: rua || '',
                numero: numero || '',
                complemento: complemento || '',
                bairro: bairro || '',
                cep: cep || '',
                cidade: cidade || '',
                estado: estado || '',
                pais: pais || 'BR'
            });

            parsedData.push({
                nome_completo: nome || '',
                email: email || '',
                telefone: telefone || '',
                cpf: cleanCPF,
                produto: produto || 'Kit 12 caixas organizadoras + brinde',
                valor_total: parseFloat(valor) || 67.90,
                endereco: endereco,
                meio_pagamento: 'PIX',
                origem: 'direto',
                etapa_atual: 1,
                status_pagamento: 'pendente',
                order_bumps: [],
                produtos: [{
                    nome: produto || 'Kit 12 caixas organizadoras + brinde',
                    preco: parseFloat(valor) || 67.90
                }],
                lineNumber: i + 1
            });
        }

        console.log(`📊 Dados processados: ${parsedData.length} leads, ${duplicatesRemoved.length} duplicatas removidas`);
        
        return {
            leads: parsedData,
            duplicatesRemoved: duplicatesRemoved
        };
    }

    buildAddressFromFields({ rua, numero, complemento, bairro, cep, cidade, estado, pais }) {
        return `${rua}, ${numero}${complemento ? ` - ${complemento}` : ''} - ${bairro} - ${cidade}/${estado} - CEP: ${cep} - ${pais}`;
    }

    displayBulkPreview() {
        const previewSection = document.getElementById('bulkPreviewSection');
        const previewContainer = document.getElementById('bulkPreviewContainer');
        const confirmButton = document.getElementById('confirmBulkImportButton');
        const previewSummary = document.getElementById('previewSummary');

        if (!previewSection || !previewContainer) return;

        previewSection.style.display = 'block';

        // Create preview table
        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nome</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Email</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Telefone</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">CPF</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Produto</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Valor</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.bulkData.leads.forEach((lead, index) => {
            const rowClass = index % 2 === 0 ? 'background: #f9f9f9;' : '';
            tableHTML += `
                <tr style="${rowClass}">
                    <td style="padding: 6px; border: 1px solid #ddd;">${lead.nome_completo}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${lead.email}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${lead.telefone}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${CPFValidator.formatCPF(lead.cpf)}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${lead.produto}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">R$ ${lead.valor_total.toFixed(2)}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';

        // Add duplicates info if any
        if (this.bulkData.duplicatesRemoved.length > 0) {
            tableHTML += `
                <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                    <strong>📋 Duplicatas Removidas (${this.bulkData.duplicatesRemoved.length}):</strong>
                    <ul style="margin: 5px 0 0 20px;">
                        ${this.bulkData.duplicatesRemoved.map(dup => 
                            `<li>${dup.nome} - CPF: ${CPFValidator.formatCPF(dup.cpf)}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        previewContainer.innerHTML = tableHTML;

        // Update summary
        if (previewSummary) {
            previewSummary.textContent = `${this.bulkData.leads.length} leads para importar${this.bulkData.duplicatesRemoved.length > 0 ? `, ${this.bulkData.duplicatesRemoved.length} duplicatas removidas` : ''}`;
        }

        // Show confirm button
        if (confirmButton) {
            confirmButton.style.display = 'inline-block';
        }
    }

    async confirmBulkImport() {
        if (!this.bulkData || !this.bulkData.leads.length) {
            this.showNotification('Nenhum dado para importar', 'error');
            return;
        }

        const confirmButton = document.getElementById('confirmBulkImportButton');
        if (!confirmButton) return;

        const originalText = confirmButton.innerHTML;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
        confirmButton.disabled = true;

        try {
            const results = await this.processBulkImport();
            this.displayBulkResults(results);
        } catch (error) {
            console.error('❌ Erro na importação em massa:', error);
            this.showNotification('Erro na importação: ' + error.message, 'error');
        } finally {
            confirmButton.innerHTML = originalText;
            confirmButton.disabled = false;
        }
    }

    async processBulkImport() {
        const results = {
            success: [],
            errors: [],
            total: this.bulkData.leads.length
        };

        for (const leadData of this.bulkData.leads) {
            try {
                // Validate lead data
                const validation = this.validateLeadData(leadData);
                if (!validation.isValid) {
                    results.errors.push({
                        nome: leadData.nome_completo,
                        cpf: leadData.cpf,
                        error: validation.error,
                        type: 'validation'
                    });
                    continue;
                }

                // Check if lead already exists in database
                const existingLead = await this.dbService.getLeadByCPF(leadData.cpf);
                if (existingLead.success && existingLead.data) {
                    results.errors.push({
                        nome: leadData.nome_completo,
                        cpf: leadData.cpf,
                        error: 'CPF já existe no banco de dados',
                        type: 'duplicate'
                    });
                    continue;
                }

                // Create lead
                const result = await this.dbService.createLead(leadData);
                if (result.success) {
                    results.success.push({
                        nome: leadData.nome_completo,
                        cpf: leadData.cpf,
                        id: result.data?.id
                    });
                } else {
                    results.errors.push({
                        nome: leadData.nome_completo,
                        cpf: leadData.cpf,
                        error: result.error || 'Erro desconhecido',
                        type: 'database'
                    });
                }
            } catch (error) {
                results.errors.push({
                    nome: leadData.nome_completo,
                    cpf: leadData.cpf,
                    error: error.message,
                    type: 'exception'
                });
            }
        }

        return results;
    }

    validateLeadData(leadData) {
        // Check required fields
        if (!leadData.nome_completo || leadData.nome_completo.trim().length < 2) {
            return { isValid: false, error: 'Nome completo é obrigatório (mínimo 2 caracteres)' };
        }

        if (!leadData.email || !this.isValidEmail(leadData.email)) {
            return { isValid: false, error: 'Email é obrigatório e deve ter formato válido' };
        }

        if (!leadData.telefone || leadData.telefone.length < 10) {
            return { isValid: false, error: 'Telefone é obrigatório (mínimo 10 dígitos)' };
        }

        if (!leadData.cpf || leadData.cpf.length !== 11) {
            return { isValid: false, error: 'CPF é obrigatório e deve ter 11 dígitos' };
        }

        if (!CPFValidator.isValidCPF(leadData.cpf)) {
            return { isValid: false, error: 'CPF inválido (formato ou dígitos verificadores incorretos)' };
        }

        return { isValid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    displayBulkResults(results) {
        const resultsSection = document.getElementById('bulkResultsSection');
        const resultsContainer = document.getElementById('bulkResultsContainer');

        if (!resultsSection || !resultsContainer) return;

        resultsSection.style.display = 'block';

        let resultsHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        `;

        // Success Section
        resultsHTML += `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px;">
                <h4 style="color: #155724; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-check-circle"></i>
                    Pedidos Postados com Sucesso (${results.success.length})
                </h4>
        `;

        if (results.success.length > 0) {
            resultsHTML += '<ul style="margin: 0; padding-left: 20px; max-height: 200px; overflow-y: auto;">';
            results.success.forEach(item => {
                resultsHTML += `<li style="margin-bottom: 5px; color: #155724;">
                    <strong>${item.nome}</strong> - CPF: ${CPFValidator.formatCPF(item.cpf)}
                </li>`;
            });
            resultsHTML += '</ul>';

            // Add "Ir para Lista" button
            resultsHTML += `
                <div style="margin-top: 15px; text-align: center;">
                    <button id="goToLeadsListButton" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                        <i class="fas fa-list"></i> Ir para Lista
                    </button>
                </div>
            `;
        } else {
            resultsHTML += '<p style="color: #856404; font-style: italic;">Nenhum pedido foi postado com sucesso.</p>';
        }

        resultsHTML += '</div>';

        // Error Section
        resultsHTML += `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px;">
                <h4 style="color: #721c24; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Pedidos com Erro (${results.errors.length})
                </h4>
        `;

        if (results.errors.length > 0) {
            resultsHTML += `
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #f5c6cb;">
                                <th style="padding: 6px; border: 1px solid #f1b0b7; text-align: left;">Nome</th>
                                <th style="padding: 6px; border: 1px solid #f1b0b7; text-align: left;">CPF</th>
                                <th style="padding: 6px; border: 1px solid #f1b0b7; text-align: left;">Motivo do Erro</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            results.errors.forEach((error, index) => {
                const rowClass = index % 2 === 0 ? 'background: #fdf2f2;' : '';
                resultsHTML += `
                    <tr style="${rowClass}">
                        <td style="padding: 6px; border: 1px solid #f1b0b7;">${error.nome}</td>
                        <td style="padding: 6px; border: 1px solid #f1b0b7;">${CPFValidator.formatCPF(error.cpf)}</td>
                        <td style="padding: 6px; border: 1px solid #f1b0b7; color: #721c24;">
                            <strong>${this.getErrorTypeLabel(error.type)}:</strong> ${error.error}
                        </td>
                    </tr>
                `;
            });

            resultsHTML += '</tbody></table></div>';
        } else {
            resultsHTML += '<p style="color: #155724; font-style: italic;">Nenhum erro encontrado! 🎉</p>';
        }

        resultsHTML += '</div></div>';

        // Summary
        resultsHTML += `
            <div style="background: #e2e3e5; border: 1px solid #d6d8db; border-radius: 8px; padding: 15px; text-align: center;">
                <h4 style="color: #383d41; margin-bottom: 10px;">📊 Resumo da Importação</h4>
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <strong style="color: #28a745;">${results.success.length}</strong>
                        <span style="color: #6c757d;"> Sucessos</span>
                    </div>
                    <div>
                        <strong style="color: #dc3545;">${results.errors.length}</strong>
                        <span style="color: #6c757d;"> Erros</span>
                    </div>
                    <div>
                        <strong style="color: #007bff;">${results.total}</strong>
                        <span style="color: #6c757d;"> Total Processados</span>
                    </div>
                    <div>
                        <strong style="color: #ffc107;">${this.bulkData.duplicatesRemoved.length}</strong>
                        <span style="color: #6c757d;"> Duplicatas Removidas</span>
                    </div>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;

        // Setup "Ir para Lista" button event
        const goToListButton = document.getElementById('goToLeadsListButton');
        if (goToListButton) {
            goToListButton.addEventListener('click', () => {
                this.showView('leadsView');
                this.refreshLeads();
            });
        }

        // Hide preview section
        const previewSection = document.getElementById('bulkPreviewSection');
        if (previewSection) {
            previewSection.style.display = 'none';
        }

        this.bulkResults = results;
    }

    getErrorTypeLabel(type) {
        const labels = {
            'validation': 'Dados Inválidos',
            'duplicate': 'Duplicidade',
            'database': 'Erro de Banco',
            'exception': 'Erro Interno'
        };
        return labels[type] || 'Erro';
    }

    clearBulkData() {
        const textarea = document.getElementById('bulkDataTextarea');
        const previewSection = document.getElementById('bulkPreviewSection');
        const resultsSection = document.getElementById('bulkResultsSection');

        if (textarea) textarea.value = '';
        if (previewSection) previewSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';

        this.bulkData = [];
        this.bulkResults = null;
    }

    editBulkData() {
        const previewSection = document.getElementById('bulkPreviewSection');
        if (previewSection) {
            previewSection.style.display = 'none';
        }

        const textarea = document.getElementById('bulkDataTextarea');
        if (textarea) {
            textarea.focus();
        }
    }

    async refreshLeads() {
        console.log('🔄 Atualizando lista de leads...');
        await this.loadLeads();
        this.showNotification('Lista atualizada com sucesso!', 'success');
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

        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        let tableHTML = '';

        pageLeads.forEach(lead => {
            const isSelected = this.selectedLeads.has(lead.id || lead.cpf);
            const produtos = Array.isArray(lead.produtos) ? lead.produtos : [];
            const produtoNome = produtos.length > 0 ? produtos[0].nome : 'Produto não informado';

            tableHTML += `
                <tr style="${isSelected ? 'background-color: #e3f2fd;' : ''}">
                    <td>
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="adminPanel.toggleLeadSelection('${lead.id || lead.cpf}', this.checked)">
                    </td>
                    <td>${lead.nome_completo || 'N/A'}</td>
                    <td>${CPFValidator.formatCPF(lead.cpf || '')}</td>
                    <td>${lead.email || 'N/A'}</td>
                    <td>${lead.telefone || 'N/A'}</td>
                    <td>${produtoNome}</td>
                    <td>R$ ${(lead.valor_total || 0).toFixed(2)}</td>
                    <td>${this.formatDate(lead.created_at)}</td>
                    <td>
                        <span class="stage-badge ${this.getStageClass(lead.etapa_atual)}">
                            ${lead.etapa_atual || 1}
                        </span>
                    </td>
                    <td>${this.formatDate(lead.updated_at)}</td>
                    <td>
                        <div class="lead-actions">
                            <button class="action-button edit" onclick="adminPanel.editLead('${lead.id || lead.cpf}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-button next" onclick="adminPanel.nextStage('${lead.id || lead.cpf}')">
                                <i class="fas fa-forward"></i>
                            </button>
                            <button class="action-button prev" onclick="adminPanel.prevStage('${lead.id || lead.cpf}')">
                                <i class="fas fa-backward"></i>
                            </button>
                            <button class="action-button delete" onclick="adminPanel.deleteLead('${lead.id || lead.cpf}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = tableHTML;
        this.updateSelectedCount();
    }

    toggleLeadSelection(leadId, isSelected) {
        if (isSelected) {
            this.selectedLeads.add(leadId);
        } else {
            this.selectedLeads.delete(leadId);
        }
        this.updateSelectedCount();
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('#leadsTableBody input[type="checkbox"]');
        
        if (selectAll) {
            this.filteredLeads.forEach(lead => {
                this.selectedLeads.add(lead.id || lead.cpf);
            });
        } else {
            this.selectedLeads.clear();
        }

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });

        this.renderLeadsTable();
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        const massActionButtons = document.querySelectorAll('.mass-action-button');
        const actionCounts = document.querySelectorAll('.action-count');

        const count = this.selectedLeads.size;

        if (selectedCount) {
            selectedCount.textContent = `${count} selecionados`;
        }

        // Enable/disable mass action buttons
        massActionButtons.forEach(button => {
            button.disabled = count === 0;
            if (count === 0) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            } else {
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });

        // Update action counts
        actionCounts.forEach(element => {
            element.textContent = `(${count} leads)`;
        });
    }

    updateLeadsCount() {
        const leadsCount = document.getElementById('leadsCount');
        if (leadsCount) {
            leadsCount.textContent = `${this.filteredLeads.length} leads`;
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Data inválida';
        }
    }

    getStageClass(stage) {
        if (stage >= 12) return 'completed';
        if (stage >= 6) return 'pending';
        return '';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;

        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            default:
                notification.style.background = '#007bff';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Placeholder methods for other functionality
    applyFilters() {
        console.log('🔍 Aplicando filtros...');
        // Implementation for filters
    }

    handleMassAction(action) {
        console.log(`🔧 Ação em massa: ${action} para ${this.selectedLeads.size} leads`);
        // Implementation for mass actions
    }

    editLead(leadId) {
        console.log(`✏️ Editando lead: ${leadId}`);
        // Implementation for edit lead
    }

    async nextStage(leadId) {
        console.log(`⏭️ Próxima etapa para lead: ${leadId}`);
        // Implementation for next stage
    }

    async prevStage(leadId) {
        console.log(`⏮️ Etapa anterior para lead: ${leadId}`);
        // Implementation for previous stage
    }

    async deleteLead(leadId) {
        if (confirm('Tem certeza que deseja excluir este lead?')) {
            console.log(`🗑️ Excluindo lead: ${leadId}`);
            // Implementation for delete lead
        }
    }
}

// Initialize admin panel when DOM is ready
let adminPanel = null;

document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Export for global access
window.adminPanel = adminPanel;

export default AdminPanel;