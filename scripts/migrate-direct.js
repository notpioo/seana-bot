const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://Avionika:Mutiaraf23@seanabot.mhfds.mongodb.net/?retryWrites=true&w=majority&appName=Seanabot";

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected Successfully!');
    } catch (error) {
        console.error('MongoDB Connection Error Details:', error);
        process.exit(1);
    }
}

// Schema definisi
const userSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    number: { type: String, required: true },
    status: { type: String, default: 'basic' },
    limit: { type: Number, default: 25 },
    balance: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now },
    lastLimitReset: { type: Date, default: Date.now },
    premiumExpiry: { type: Date, default: null },
    isBanned: { type: Boolean, default: false },
    banExpiry: { type: Date, default: null }
});

const UserModel = mongoose.model('User', userSchema);

async function migrateData() {
    try {
        await connectDB();
        
        const usersPath = path.join(__dirname, '../database/data/users.json');
        console.log('Reading from:', usersPath);
        
        const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        console.log('Users data loaded, count:', Object.keys(usersData).length);

        for (const [jid, userData] of Object.entries(usersData)) {
            try {
                await UserModel.findOneAndUpdate(
                    { jid },
                    {
                        ...userData,
                        jid
                    },
                    { upsert: true, new: true }
                );
                console.log(`Migrated user: ${jid}`);
            } catch (error) {
                console.error(`Error migrating user ${jid}:`, error);
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateData();