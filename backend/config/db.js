import mongoose from 'mongoose';

/**
 * MongoDB Connection Module
 * Handles connection to MongoDB with retry logic and error handling
 */

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Connection options
    const options = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    console.log(` MongoDB connected: ${conn.connection.host}`);

    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      console.log(' MongoDB: connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('  MongoDB: disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n Shutting down gracefully...');
      await mongoose.mongoose.disconnect();
      console.log('📴 MongoDB disconnected');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(' MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Helper: Close database connection
 * Used for testing or manual shutdown
 */
export const closeDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('📴 MongoDB disconnected');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    process.exit(1);
  }
};

/**
 * Helper: Get current connection status
 */
export const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

export default mongoose;
