require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('./src/models/user.model');
const Product = require('./src/models/product.model');
const Category = require('./src/models/category.model');
const Orden = require('./src/models/orden.model');
const Wallet = require('./src/models/wallet.model');
const WalletMovement = require('./src/models/wallet_movements_model');

// Import wallet service
const walletService = require('./src/services/wallet.service');

async function testWalletSystem() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_CNN);
        console.log('✅ Connected to MongoDB!');

        // Clean test data
        console.log('🧹 Cleaning test data...');
        await User.deleteMany({ email: { $regex: /test.*@test\.com/ } });
        await Category.deleteMany({ name: /test/i });
        await Product.deleteMany({ name: /test/i });
        await Orden.deleteMany({});
        await Wallet.deleteMany({});
        await WalletMovement.deleteMany({});

        // 1. Create test category
        console.log('📁 Creating test category...');
        const category = new Category({
            name: 'Test Category',
            description: 'Test category for wallet system',
            state: true
        });
        await category.save();

        // 2. Create test seller user
        console.log('👩‍💼 Creating test seller...');
        const seller = new User({
            firstName: 'Ana',
            lastName: 'Vendedora',
            email: 'test.seller@test.com',
            mobile: '573001234567',
            password: 'hashedpassword123',
            role: 'VENDEDORA_ROLE',
            state: true
        });
        await seller.save();

        // 3. Create seller's wallet
        console.log('💰 Creating seller wallet...');
        const wallet = new Wallet({
            userId: seller._id,
            balance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            points: 0,
            settings: {
                commissionRate: 0.15, // 15%
                pointsPerSale: 10,
                minimumWithdrawal: 50000
            }
        });
        await wallet.save();

        // 4. Create test product
        console.log('📦 Creating test product...');
        const product = new Product({
            name: 'Test Product',
            price: 100000, // $100,000 COP
            category: category._id,
            description: 'Test product for wallet system',
            available: true,
            user: seller._id,
            cost: 60000, // Cost $60,000 - margin $40,000
            commission: 0.15 // 15% commission
        });
        await product.save();

        // 5. Create test order
        console.log('🛒 Creating test order...');
        const order = new Orden({
            user: seller._id,
            items: [{
                product: product._id,
                quantity: 2,
                price: product.price,
                cost: product.cost,
                commission: (product.price - product.cost) * product.commission, // $6,000 per item
                points: 10 // 10 points per item
            }],
            total: product.price * 2, // $200,000
            totalCommission: (product.price - product.cost) * product.commission * 2, // $12,000 total
            totalPoints: 20, // 20 points total
            state: 'pending'
        });
        await order.save();

        // 6. Test wallet service - process commission
        console.log('⚙️ Processing commission...');
        await walletService.processCommission(seller._id, order._id, order.totalCommission, order.totalPoints);

        // 7. Verify wallet state
        console.log('🔍 Checking wallet state...');
        const updatedWallet = await Wallet.findOne({ userId: seller._id });
        console.log('Wallet State:', {
            balance: updatedWallet.balance,
            pendingBalance: updatedWallet.pendingBalance,
            points: updatedWallet.points,
            totalEarnings: updatedWallet.totalEarnings
        });

        // 8. Check wallet movements
        const movements = await WalletMovement.find({ userId: seller._id });
        console.log('Wallet Movements:', movements.map(m => ({
            type: m.type,
            amount: m.amount,
            points: m.points,
            status: m.status,
            description: m.description
        })));

        // 9. Test approve commission (admin action)
        console.log('✅ Approving commission...');
        await walletService.approveCommission(movements[0]._id);

        // 10. Check final wallet state
        const finalWallet = await Wallet.findOne({ userId: seller._id });
        console.log('Final Wallet State:', {
            balance: finalWallet.balance,
            pendingBalance: finalWallet.pendingBalance,
            points: finalWallet.points,
            totalEarnings: finalWallet.totalEarnings
        });

        console.log('🎉 Wallet system test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testWalletSystem();
}

module.exports = { testWalletSystem };
