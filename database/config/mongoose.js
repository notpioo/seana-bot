const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Avionika:Mutiaraf23@seanabot.mhfds.mongodb.net/?retryWrites=true&w=majority&appName=Seanabot';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB.');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }

    mongoose.connection.on('error', err => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        } catch (err) {
            console.error('Error during MongoDB disconnect:', err);
            process.exit(1);
        }
    });
};

module.exports = connectDB;