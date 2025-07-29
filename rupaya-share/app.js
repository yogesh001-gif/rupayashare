const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// In-memory storage (use database in production)
let groups = {};

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create new expense group
app.post('/api/groups', (req, res) => {
    try {
        const groupId = uuidv4();
        const { groupName } = req.body;
        
        groups[groupId] = {
            id: groupId,
            name: groupName || `Group ${groupId.slice(0, 8)}`,
            members: [],
            expenses: [],
            createdAt: new Date(),
            lastUpdated: new Date()
        };
        
        console.log(`✅ Group created: ${groupId}`);
        res.json({ 
            success: true, 
            groupId, 
            group: groups[groupId] 
        });
    } catch (error) {
        console.error('❌ Error creating group:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add member to group
app.post('/api/groups/:groupId/members', (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, upiId } = req.body;
        
        if (!groups[groupId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group not found' 
            });
        }
        
        // Validate inputs
        if (!name || !upiId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and UPI ID are required' 
            });
        }
        
        // Validate UPI ID format
        const upiPattern = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/;
        if (!upiPattern.test(upiId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid UPI ID format. Example: username@bankname' 
            });
        }
        
        // Check for duplicate UPI ID
        const existingMember = groups[groupId].members.find(m => m.upiId.toLowerCase() === upiId.toLowerCase());
        if (existingMember) {
            return res.status(400).json({ 
                success: false, 
                error: 'This UPI ID is already added to the group' 
            });
        }
        
        const member = {
            id: uuidv4(),
            name: name.trim(),
            upiId: upiId.trim().toLowerCase(),
            addedAt: new Date()
        };
        
        groups[groupId].members.push(member);
        groups[groupId].lastUpdated = new Date();
        
        console.log(`✅ Member added to group ${groupId}: ${name}`);
        res.json({ 
            success: true, 
            member,
            group: groups[groupId] 
        });
    } catch (error) {
        console.error('❌ Error adding member:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Remove member from group
app.delete('/api/groups/:groupId/members/:memberId', (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        
        if (!groups[groupId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group not found' 
            });
        }
        
        const memberIndex = groups[groupId].members.findIndex(m => m.id === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Member not found' 
            });
        }
        
        const removedMember = groups[groupId].members.splice(memberIndex, 1)[0];
        groups[groupId].lastUpdated = new Date();
        
        console.log(`✅ Member removed from group ${groupId}: ${removedMember.name}`);
        res.json({ 
            success: true, 
            removedMember,
            group: groups[groupId] 
        });
    } catch (error) {
        console.error('❌ Error removing member:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add expense to group
app.post('/api/groups/:groupId/expenses', (req, res) => {
    try {
        const { groupId } = req.params;
        const { description, amount, paidBy } = req.body;
        
        if (!groups[groupId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group not found' 
            });
        }
        
        // Validate inputs
        if (!description || !amount || !paidBy) {
            return res.status(400).json({ 
                success: false, 
                error: 'Description, amount, and payer are required' 
            });
        }
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Amount must be a positive number' 
            });
        }
        
        // Verify member exists
        const member = groups[groupId].members.find(m => m.name === paidBy);
        if (!member) {
            return res.status(400).json({ 
                success: false, 
                error: 'Member not found in group' 
            });
        }
        
        const expense = {
            id: uuidv4(),
            description: description.trim(),
            amount: Math.round(parsedAmount * 100) / 100, // Round to 2 decimal places
            paidBy: paidBy.trim(),
            timestamp: new Date()
        };
        
        groups[groupId].expenses.push(expense);
        groups[groupId].lastUpdated = new Date();
        
        console.log(`✅ Expense added to group ${groupId}: ${description} - ₹${expense.amount}`);
        res.json({ 
            success: true, 
            expense,
            group: groups[groupId] 
        });
    } catch (error) {
        console.error('❌ Error adding expense:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Calculate settlements with enhanced algorithm
app.get('/api/groups/:groupId/settlements', (req, res) => {
    try {
        const { groupId } = req.params;
        const group = groups[groupId];
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group not found' 
            });
        }
        
        if (group.members.length < 2) {
            return res.json({ 
                success: true, 
                settlements: [],
                summary: {
                    totalExpenses: 0,
                    perPersonShare: 0,
                    memberCount: group.members.length,
                    message: 'Need at least 2 members to calculate settlements'
                }
            });
        }
        
        const settlements = calculateSettlements(group);
        const totalExpenses = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        console.log(`✅ Settlements calculated for group ${groupId}: ${settlements.length} transactions`);
        res.json({ 
            success: true, 
            settlements,
            summary: {
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                perPersonShare: Math.round((totalExpenses / group.members.length) * 100) / 100,
                memberCount: group.members.length,
                transactionCount: settlements.length
            }
        });
    } catch (error) {
        console.error('❌ Error calculating settlements:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Generate QR code for UPI payment
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { upiId, name, amount, note } = req.body;
        
        // Validate inputs
        if (!upiId || !name || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'UPI ID, name, and amount are required' 
            });
        }
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Amount must be a positive number' 
            });
        }
        
        const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || 'RupayaShare payment')}`;
        
        const qrCodeDataURL = await QRCode.toDataURL(upiLink, {
            width: 300,
            height: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });
        
        console.log(`✅ QR code generated for ${name}: ₹${parsedAmount}`);
        res.json({ 
            success: true, 
            qrCode: qrCodeDataURL,
            upiLink 
        });
    } catch (error) {
        console.error('❌ Error generating QR code:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get group details
app.get('/api/groups/:groupId', (req, res) => {
    try {
        const { groupId } = req.params;
        const group = groups[groupId];
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group not found' 
            });
        }
        
        res.json({ 
            success: true, 
            group 
        });
    } catch (error) {
        console.error('❌ Error getting group:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Enhanced settlement calculation algorithm
function calculateSettlements(group) {
    const { members, expenses } = group;
    
    if (members.length === 0 || expenses.length === 0) {
        return [];
    }
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const perPersonShare = totalExpenses / members.length;
    
    // Calculate balances for each member
    const balances = members.map(member => {
        const amountPaid = expenses
            .filter(exp => exp.paidBy === member.name)
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const balance = amountPaid - perPersonShare;
        
        return {
            name: member.name,
            upiId: member.upiId,
            paid: Math.round(amountPaid * 100) / 100,
            share: Math.round(perPersonShare * 100) / 100,
            balance: Math.round(balance * 100) / 100
        };
    });
    
    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors = balances
        .filter(b => b.balance > 0.01)
        .sort((a, b) => b.balance - a.balance)
        .map(c => ({ ...c })); // Create copies
    
    const debtors = balances
        .filter(b => b.balance < -0.01)
        .sort((a, b) => a.balance - b.balance)
        .map(d => ({ ...d })); // Create copies
    
    const settlements = [];
    
    // Greedy algorithm to minimize number of transactions
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        
        const settlementAmount = Math.min(creditor.balance, Math.abs(debtor.balance));
        const roundedAmount = Math.round(settlementAmount * 100) / 100;
        
        if (roundedAmount > 0.01) {
            settlements.push({
                id: uuidv4(),
                from: debtor.name,
                fromUpi: debtor.upiId,
                to: creditor.name,
                toUpi: creditor.upiId,
                amount: roundedAmount,
                note: `RupayaShare: ${debtor.name} pays ${creditor.name}`
            });
        }
        
        creditor.balance = Math.round((creditor.balance - roundedAmount) * 100) / 100;
        debtor.balance = Math.round((debtor.balance + roundedAmount) * 100) / 100;
        
        if (Math.abs(creditor.balance) < 0.01) i++;
        if (Math.abs(debtor.balance) < 0.01) j++;
    }
    
    return settlements;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'healthy',
        timestamp: new Date(),
        activeGroups: Object.keys(groups).length
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Something went wrong on the server!' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log('🚀 RupayaShare Server Started');
    console.log(`📱 Access the app at: http://localhost:${port}`);
    console.log(`🔗 API Health Check: http://localhost:${port}/api/health`);
    console.log('💰 Ready to split expenses with UPI payments!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Server interrupted, shutting down...');
    process.exit(0);
});
