class RupayaShare {
    constructor() {
        this.currentGroupId = null;
        this.members = [];
        this.expenses = [];
        this.settlements = [];
        
        // Initialize splash screen
        this.initializeSplashScreen();
        this.initializeEventListeners();
        console.log('🚀 RupayaShare initialized');
    }
    
    initializeSplashScreen() {
        // Add a small delay to ensure the splash screen is visible
        setTimeout(() => {
            const splashLogo = document.querySelector('.splash-logo');
            const splashScreen = document.querySelector('.splash-screen');
            
            if (splashLogo) {
                // Add dynamic exit animation
                splashLogo.style.animation = 'zoomOut 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards';
                
                // Add particles effect on exit
                this.createParticles(splashScreen);
            }
            
            // Hide splash screen after the animation
            setTimeout(() => {
                document.body.classList.add('loaded');
                
                // Remove splash screen from DOM after animation completes
                if (splashScreen) {
                    splashScreen.addEventListener('transitionend', () => {
                        splashScreen.style.display = 'none';
                    }, { once: true });
                }
            }, 800);
        }, 1200); // Show for 1.2 seconds
    }
    
    createParticles(container) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607'];
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 10 + 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1001;
                opacity: 0;
                animation: floatAway ${Math.random() * 2 + 1}s ease-out forwards;
            `;
            
            // Position particles around the logo
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            particle.style.left = `calc(50% + ${x}px)`;
            particle.style.top = `calc(50% + ${y}px)`;
            particle.style.animationDelay = `${Math.random() * 0.5}s`;
            
            // Add keyframes for this particle
            const keyframes = `
                @keyframes floatAway {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(
                            ${x * 5}px, 
                            ${y * 5 - 100}px
                        ) scale(0);
                        opacity: 0;
                    }
                }
            `;
            
            const style = document.createElement('style');
            style.innerHTML = keyframes;
            document.head.appendChild(style);
            
            container.appendChild(particle);
            
            // Remove the style element after animation completes
            setTimeout(() => {
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 2000);
        }
    }
    
    initializeEventListeners() {
        // Group creation
        document.getElementById('create-group-btn').addEventListener('click', () => {
            this.createGroup();
        });
        
        // Copy group ID
        document.getElementById('copy-group-id').addEventListener('click', () => {
            this.copyGroupId();
        });
        
        // Member form
        document.getElementById('member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMember();
        });
        
        // Expense form
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });
        
        // Calculate settlements
        document.getElementById('calculate-settlements').addEventListener('click', () => {
            this.calculateSettlements();
        });
        
        // Clear amounts button
        document.getElementById('clear-amounts').addEventListener('click', () => {
            this.clearAllAmounts();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                // Ctrl+Enter to submit active form
                const activeForm = document.querySelector('form:focus-within');
                if (activeForm) {
                    activeForm.querySelector('button[type="submit"]').click();
                }
            }
        });
    }
    
    async createGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ groupName })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentGroupId = data.groupId;
                this.showGroupInfo(data.group);
                this.showToast('🎉 Group created successfully!', 'success');
                console.log('✅ Group created:', data.groupId);
            } else {
                this.showToast(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error creating group:', error);
            this.showToast('❌ Failed to create group. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showGroupInfo(group) {
        document.getElementById('group-id-text').textContent = group.id;
        document.getElementById('group-info').style.display = 'block';
        document.getElementById('members-section').style.display = 'block';
        
        // Hide setup section with animation
        const setupSection = document.querySelector('.setup-section');
        setupSection.style.opacity = '0.5';
        setupSection.style.pointerEvents = 'none';
        
        // Scroll to members section
        document.getElementById('members-section').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    async copyGroupId() {
        const groupId = document.getElementById('group-id-text').textContent;
        try {
            await navigator.clipboard.writeText(groupId);
            this.showToast('📋 Group ID copied to clipboard!', 'success');
        } catch (error) {
            console.error('❌ Error copying group ID:', error);
            this.showToast('❌ Failed to copy Group ID', 'error');
        }
    }
    
    async addMember() {
        const name = document.getElementById('member-name').value.trim();
        const upiId = document.getElementById('member-upi').value.trim();
        
        if (!name || !upiId) {
            this.showToast('⚠️ Please fill in all member details', 'warning');
            return;
        }
        
        if (!this.validateUpiId(upiId)) {
            this.showToast('❌ Please enter a valid UPI ID (e.g., username@paytm)', 'error');
            return;
        }
        
        // Check for duplicate names
        if (this.members.some(member => member.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('⚠️ Member with this name already exists', 'warning');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/groups/${this.currentGroupId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, upiId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.members = data.group.members;
                this.displayMembers();
                this.showExpensesSection();
                
                // Clear form
                document.getElementById('member-name').value = '';
                document.getElementById('member-upi').value = '';
                
                this.showToast(`✅ ${name} added successfully!`, 'success');
                console.log('✅ Member added:', name);
            } else {
                this.showToast(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error adding member:', error);
            this.showToast('❌ Failed to add member. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    validateUpiId(upiId) {
        const upiPattern = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/;
        return upiPattern.test(upiId);
    }
    
    displayMembers() {
        const membersList = document.getElementById('members-list');
        
        if (this.members.length === 0) {
            membersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No members yet</h3>
                    <p>Add the first member to get started</p>
                </div>
            `;
            return;
        }
        
        membersList.innerHTML = this.members.map(member => `
            <div class="member-item">
                <div class="member-info">
                    <div class="member-name">${this.escapeHtml(member.name)}</div>
                    <div class="member-upi">${this.escapeHtml(member.upiId)}</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="app.removeMember('${member.id}')">
                    <span class="icon">🗑️</span>
                    Remove
                </button>
            </div>
        `).join('');
        
        // Generate payment inputs when members are updated
        this.generateMemberPaymentInputs();
        this.updateSummary();
    }
    
    showExpensesSection() {
        if (this.members.length >= 1) {
            document.getElementById('expenses-section').style.display = 'block';
            this.generateMemberPaymentInputs();
        }
    }
    
    generateMemberPaymentInputs() {
        const container = document.getElementById('member-payments-container');
        if (!container || this.members.length === 0) return;
        
        container.innerHTML = this.members.map(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const shortUpi = member.upiId.length > 25 ? member.upiId.slice(0, 22) + '...' : member.upiId;
            
            return `
                <div class="member-payment-card" id="card-${member.id}">
                    <div class="member-payment-header">
                        <div class="member-avatar">${initials}</div>
                        <div class="member-info">
                            <h4>${this.escapeHtml(member.name)}</h4>
                            <div class="member-upi-short">${this.escapeHtml(shortUpi)}</div>
                        </div>
                    </div>
                    <div class="payment-input-wrapper">
                        <span class="currency-symbol">₹</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="999999"
                            id="pay-amount-${member.id}" 
                            class="payment-input"
                            placeholder="0.00"
                            data-member-id="${member.id}"
                        >
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for real-time total calculation
        this.setupPaymentInputListeners();
    }
    
    setupPaymentInputListeners() {
        this.members.forEach(member => {
            const input = document.getElementById(`pay-amount-${member.id}`);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateExpenseTotal();
                    this.updateInputStyles();
                });
                
                input.addEventListener('keypress', (e) => {
                    // Allow only numbers and decimal point
                    if (!/[\d.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                        e.preventDefault();
                    }
                });
            }
        });
    }
    
    updateExpenseTotal() {
        const total = this.members.reduce((sum, member) => {
            const input = document.getElementById(`pay-amount-${member.id}`);
            const amount = parseFloat(input?.value || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        const totalDisplay = document.getElementById('expense-total');
        if (totalDisplay) {
            totalDisplay.textContent = `₹${total.toFixed(2)}`;
        }
    }
    
    updateInputStyles() {
        this.members.forEach(member => {
            const input = document.getElementById(`pay-amount-${member.id}`);
            const card = document.getElementById(`card-${member.id}`);
            
            if (input && card) {
                const value = parseFloat(input.value);
                const hasValue = !isNaN(value) && value > 0;
                
                if (hasValue) {
                    input.classList.add('has-value');
                    card.classList.add('has-amount');
                } else {
                    input.classList.remove('has-value');
                    card.classList.remove('has-amount');
                }
            }
        });
    }
    
    clearAllAmounts() {
        this.members.forEach(member => {
            const input = document.getElementById(`pay-amount-${member.id}`);
            if (input) {
                input.value = '';
            }
        });
        this.updateExpenseTotal();
        this.updateInputStyles();
        this.showToast('🧹 All amounts cleared', 'info');
    }
    
    async addExpense() {
        const description = document.getElementById('expense-description').value.trim();
        
        if (!description) {
            this.showToast('⚠️ Please enter an expense description', 'warning');
            return;
        }
        
        // Collect payment amounts for each member
        const payments = [];
        let totalAmount = 0;
        
        this.members.forEach(member => {
            const input = document.getElementById(`pay-amount-${member.id}`);
            const amount = parseFloat(input?.value || 0);
            
            if (!isNaN(amount) && amount > 0) {
                payments.push({
                    memberName: member.name,
                    amount: amount
                });
                totalAmount += amount;
            }
        });
        
        if (totalAmount <= 0) {
            this.showToast('⚠️ Please enter at least one payment amount', 'warning');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // Add individual payments as separate expense entries
            for (const payment of payments) {
                const response = await fetch(`/api/groups/${this.currentGroupId}/expenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description,
                        amount: payment.amount,
                        paidBy: payment.memberName
                    })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    this.showToast(`❌ ${data.error}`, 'error');
                    return;
                }
            }
            
            // Refresh expenses from server
            await this.refreshGroupData();
            
            // Clear form
            document.getElementById('expense-description').value = '';
            this.clearAllAmounts();
            
            this.showToast(`✅ Expense "${description}" added! Total: ₹${totalAmount.toFixed(2)}`, 'success');
            console.log('✅ Expense added:', description, totalAmount);
            
        } catch (error) {
            console.error('❌ Error adding expense:', error);
            this.showToast('❌ Failed to add expense. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    displayExpenses() {
        const expensesList = document.getElementById('expenses-list');
        
        if (this.expenses.length === 0) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <h3>No expenses yet</h3>
                    <p>Add your first expense to get started</p>
                </div>
            `;
            return;
        }
        
        // Group expenses by description and date
        const groupedExpenses = this.groupExpensesByDescription();
        
        expensesList.innerHTML = Object.values(groupedExpenses).map(expenseGroup => {
            const totalAmount = expenseGroup.payments.reduce((sum, payment) => sum + payment.amount, 0);
            
            return `
                <div class="expense-item-enhanced">
                    <div class="expense-header">
                        <div class="expense-title">${this.escapeHtml(expenseGroup.description)}</div>
                        <div class="expense-total-amount">₹${totalAmount.toFixed(2)}</div>
                    </div>
                    <div class="expense-meta">
                        <small class="text-muted">
                            <span class="icon">📅</span>
                            Added on ${new Date(expenseGroup.timestamp).toLocaleDateString()} 
                            at ${new Date(expenseGroup.timestamp).toLocaleTimeString()}
                        </small>
                    </div>
                    <div class="expense-breakdown">
                        ${expenseGroup.payments.map(payment => `
                            <div class="payment-breakdown-item">
                                <span class="payer-name">${this.escapeHtml(payment.paidBy)}</span>
                                <span class="payment-amount">₹${payment.amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    groupExpensesByDescription() {
        const grouped = {};
        
        this.expenses.forEach(expense => {
            const date = new Date(expense.timestamp);
            const key = `${expense.description}-${date.toDateString()}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    description: expense.description,
                    timestamp: expense.timestamp,
                    payments: []
                };
            }
            
            grouped[key].payments.push({
                paidBy: expense.paidBy,
                amount: expense.amount
            });
        });
        
        return grouped;
    }
    
    showSummarySection() {
        if (this.expenses.length > 0) {
            document.getElementById('summary-section').style.display = 'block';
            this.updateSummary();
        }
    }
    
    updateSummary() {
        const totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const perPersonShare = this.members.length > 0 ? totalExpenses / this.members.length : 0;
        
        document.getElementById('total-expenses').textContent = `₹${totalExpenses.toFixed(2)}`;
        document.getElementById('per-person-share').textContent = `₹${perPersonShare.toFixed(2)}`;
        document.getElementById('total-members').textContent = this.members.length;
    }
    
    showSettlementsSection() {
        if (this.expenses.length > 0 && this.members.length > 1) {
            document.getElementById('settlements-section').style.display = 'block';
        }
    }
    
    async calculateSettlements() {
        if (this.members.length < 2) {
            this.showToast('⚠️ Need at least 2 members to calculate settlements', 'warning');
            return;
        }
        
        if (this.expenses.length === 0) {
            this.showToast('⚠️ No expenses to settle', 'warning');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/groups/${this.currentGroupId}/settlements`);
            const data = await response.json();
            
            if (data.success) {
                this.settlements = data.settlements;
                this.displaySettlements();
                this.showToast('🧮 Settlements calculated successfully!', 'success');
                console.log('✅ Settlements calculated:', data.settlements.length, 'transactions');
            } else {
                this.showToast(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error calculating settlements:', error);
            this.showToast('❌ Failed to calculate settlements. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    displaySettlements() {
        const settlementsList = document.getElementById('settlements-list');
        
        if (this.settlements.length === 0) {
            settlementsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <h3>All settled up!</h3>
                    <p>No payments needed. Everyone's even!</p>
                </div>
            `;
            return;
        }
        
        settlementsList.innerHTML = this.settlements.map((settlement, index) => `
            <div class="settlement-item">
                <div class="settlement-header">
                    <div class="settlement-info">
                        <div class="settlement-details">
                            <span class="from-to">${this.escapeHtml(settlement.from)}</span> 
                            <span class="icon">💸</span>
                            pays 
                            <span class="from-to">${this.escapeHtml(settlement.to)}</span>
                        </div>
                        <div class="settlement-details">
                            <span class="icon">💳</span>
                            UPI ID: <code>${this.escapeHtml(settlement.toUpi)}</code>
                        </div>
                    </div>
                    <div class="settlement-amount">₹${settlement.amount.toFixed(2)}</div>
                </div>
                
                <div class="settlement-actions">
                    <button class="btn btn-success" onclick="app.generateQRCode(${index})">
                        <span class="icon">📱</span>
                        Generate QR Code
                    </button>
                    <button class="btn btn-primary" onclick="app.copyUpiLink(${index})">
                        <span class="icon">📋</span>
                        Copy UPI Link
                    </button>
                    <button class="btn btn-outline" onclick="app.openUpiApp(${index})">
                        <span class="icon">💳</span>
                        Open UPI App
                    </button>
                </div>
                
                <div id="qr-container-${index}" class="qr-container" style="display: none;">
                    <h4><span class="icon">📱</span> Scan to Pay</h4>
                    <div class="qr-code" id="qr-code-${index}"></div>
                    <p><strong>${this.escapeHtml(settlement.from)}</strong> → <strong>${this.escapeHtml(settlement.to)}</strong></p>
                    <p>Amount: <strong>₹${settlement.amount.toFixed(2)}</strong></p>
                    <button class="btn btn-sm btn-outline" onclick="app.downloadQRCode(${index})">
                        <span class="icon">⬇️</span>
                        Download QR
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async generateQRCode(settlementIndex) {
        const settlement = this.settlements[settlementIndex];
        const note = `RupayaShare: ${settlement.from} to ${settlement.to}`;
        
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/generate-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    upiId: settlement.toUpi,
                    name: settlement.to,
                    amount: settlement.amount,
                    note: note
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const qrContainer = document.getElementById(`qr-container-${settlementIndex}`);
                const qrCodeDiv = document.getElementById(`qr-code-${settlementIndex}`);
                
                qrCodeDiv.innerHTML = `<img src="${data.qrCode}" alt="QR Code for payment" style="max-width: 100%; height: auto;">`;
                qrContainer.style.display = 'block';
                
                // Scroll to QR code
                qrContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                this.showToast('📱 QR Code generated successfully!', 'success');
                console.log('✅ QR code generated for:', settlement.from, '→', settlement.to);
            } else {
                this.showToast(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            this.showToast('❌ Failed to generate QR code. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async copyUpiLink(settlementIndex) {
        const settlement = this.settlements[settlementIndex];
        const note = `RupayaShare: ${settlement.from} to ${settlement.to}`;
        const upiLink = `upi://pay?pa=${settlement.toUpi}&pn=${encodeURIComponent(settlement.to)}&am=${settlement.amount}&cu=INR&tn=${encodeURIComponent(note)}`;
        
        try {
            await navigator.clipboard.writeText(upiLink);
            this.showToast('📋 UPI link copied to clipboard!', 'success');
        } catch (error) {
            console.error('❌ Error copying UPI link:', error);
            // Fallback for older browsers
            this.fallbackCopyTextToClipboard(upiLink);
        }
    }
    
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showToast('📋 UPI link copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('❌ Failed to copy UPI link', 'error');
        }
        
        document.body.removeChild(textArea);
    }
    
    openUpiApp(settlementIndex) {
        const settlement = this.settlements[settlementIndex];
        const note = `RupayaShare: ${settlement.from} to ${settlement.to}`;
        const upiLink = `upi://pay?pa=${settlement.toUpi}&pn=${encodeURIComponent(settlement.to)}&am=${settlement.amount}&cu=INR&tn=${encodeURIComponent(note)}`;
        
        // Try to open UPI app
        window.location.href = upiLink;
        
        // Fallback message
        setTimeout(() => {
            this.showToast('💳 If UPI app didn\'t open, try copying the link and pasting in your UPI app', 'info');
        }, 2000);
    }
    
    downloadQRCode(settlementIndex) {
        const qrImg = document.querySelector(`#qr-code-${settlementIndex} img`);
        const settlement = this.settlements[settlementIndex];
        
        if (qrImg) {
            const link = document.createElement('a');
            link.download = `RupayaShare-QR-${settlement.from}-to-${settlement.to}.png`;
            link.href = qrImg.src;
            link.click();
            
            this.showToast('⬇️ QR Code downloaded!', 'success');
        } else {
            this.showToast('❌ QR Code not found. Please generate it first.', 'error');
        }
    }
    
    async removeMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        // Check if member has expenses
        const hasExpenses = this.expenses.some(exp => exp.paidBy === member.name);
        
        if (hasExpenses) {
            const confirmMessage = `${member.name} has expenses recorded. Removing them will affect calculations. Are you sure?`;
            if (!confirm(confirmMessage)) return;
        } else {
            if (!confirm(`Remove ${member.name} from the group?`)) return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/groups/${this.currentGroupId}/members/${memberId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.members = data.group.members;
                this.displayMembers();
                this.showToast(`✅ ${member.name} removed from group`, 'success');
                
                // Refresh data
                await this.refreshGroupData();
            } else {
                this.showToast(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error removing member:', error);
            this.showToast('❌ Failed to remove member. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async refreshGroupData() {
        try {
            const response = await fetch(`/api/groups/${this.currentGroupId}`);
            const data = await response.json();
            
            if (data.success) {
                this.expenses = data.group.expenses;
                this.displayExpenses();
                this.showSummarySection();
                this.showSettlementsSection();
            }
        } catch (error) {
            console.error('❌ Error refreshing group data:', error);
        }
    }
    
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }
    
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add icon based on type
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || '✅';
        
        toast.innerHTML = `<span class="icon">${icon}</span>${message}`;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
        
        // Allow manual close by clicking
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app
const app = new RupayaShare();

// Make app globally available for onclick handlers
window.app = app;

// Service worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

console.log('🚀 RupayaShare application loaded successfully!');
