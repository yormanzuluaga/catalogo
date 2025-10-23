require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        console.log('URL:', process.env.MONGODB_CNN);
        
        await mongoose.connect(process.env.MONGODB_CNN);
        
        console.log('✅ MongoDB connected successfully!');
        
        // Test basic operations
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Available collections:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('IP')) {
            console.log('\n🛠️  IP Whitelist Issue Detected!');
            console.log('Current IP:', '191.95.34.187');
            console.log('\nTo fix this:');
            console.log('1. Go to MongoDB Atlas dashboard');
            console.log('2. Navigate to Network Access');
            console.log('3. Add IP Address: 191.95.34.187');
            console.log('4. Or add 0.0.0.0/0 for all IPs (less secure)');
        }
    }
}

testConnection();
