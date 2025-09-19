const cron = require('node-cron');
const mongoose = require('mongoose');
const { dailyStockProcess, stockContinuityCheck, lowStockAlert } = require('./dailyStockProcessor');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/liquor_pos_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

class StockScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting Stock Management Scheduler...');
    this.isRunning = true;

    // Daily stock process - Run at 1:00 AM every day
    const dailyJob = cron.schedule('0 1 * * *', async () => {
      console.log('⏰ Running daily stock process...');
      try {
        const result = await dailyStockProcess();
        console.log('✅ Daily stock process completed:', result.success ? 'Success' : 'Failed');
        if (!result.success) {
          console.error('❌ Daily stock process error:', result.error);
        }
      } catch (error) {
        console.error('❌ Daily stock process failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Stock continuity check - Run at 2:00 AM every day
    const continuityJob = cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running stock continuity check...');
      try {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        const endDate = new Date();
        const result = await stockContinuityCheck(startDate, endDate);
        console.log('✅ Stock continuity check completed:', result.success ? 'Success' : 'Failed');
        if (result.continuity_issues > 0) {
          console.log(`⚠️ Found ${result.continuity_issues} continuity issues`);
        }
      } catch (error) {
        console.error('❌ Stock continuity check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Low stock alert - Run at 9:00 AM every day
    const lowStockJob = cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Running low stock alert...');
      try {
        const result = await lowStockAlert();
        console.log('✅ Low stock alert completed:', result.success ? 'Success' : 'Failed');
        if (result.low_stock_count > 0) {
          console.log(`⚠️ Found ${result.low_stock_count} products with low stock`);
        }
      } catch (error) {
        console.error('❌ Low stock alert failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Stock health check - Run every 6 hours
    const healthCheckJob = cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ Running stock health check...');
      try {
        const StockService = require('../services/StockService');
        const summary = await StockService.getStockSummary();
        console.log('📊 Stock Health Summary:');
        console.log(`   - Total Products: ${summary.total_products}`);
        console.log(`   - Total Stock: ${summary.total_stock}`);
        console.log(`   - Total Value: ₹${summary.total_stock_value.toLocaleString()}`);
        console.log(`   - Low Stock Products: ${summary.low_stock_products}`);
        console.log(`   - Zero Stock Products: ${summary.zero_stock_products}`);
        console.log(`   - Health Percentage: ${summary.stock_health_percentage.toFixed(2)}%`);
      } catch (error) {
        console.error('❌ Stock health check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Store job references
    this.jobs.set('daily', dailyJob);
    this.jobs.set('continuity', continuityJob);
    this.jobs.set('lowStock', lowStockJob);
    this.jobs.set('healthCheck', healthCheckJob);

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started ${name} job`);
    });

    console.log('🎯 All scheduled jobs started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Stock Management Scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped ${name} job`);
    });

    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ Scheduler stopped successfully');
  }

  // Get scheduler status
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });

    return status;
  }

  // Run a specific job manually
  async runJob(jobName) {
    console.log(`🔄 Running ${jobName} job manually...`);
    
    try {
      switch (jobName) {
        case 'daily':
          const result = await dailyStockProcess();
          console.log('✅ Daily job completed:', result.success ? 'Success' : 'Failed');
          return result;
          
        case 'continuity':
          const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const endDate = new Date();
          const continuityResult = await stockContinuityCheck(startDate, endDate);
          console.log('✅ Continuity job completed:', continuityResult.success ? 'Success' : 'Failed');
          return continuityResult;
          
        case 'lowStock':
          const lowStockResult = await lowStockAlert();
          console.log('✅ Low stock job completed:', lowStockResult.success ? 'Success' : 'Failed');
          return lowStockResult;
          
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
    } catch (error) {
      console.error(`❌ ${jobName} job failed:`, error);
      return { success: false, error: error.message };
    }
  }

  // List all available jobs
  listJobs() {
    const jobs = [
      {
        name: 'daily',
        description: 'Daily stock process - creates snapshots, updates opening stock, syncs current stock',
        schedule: '0 1 * * * (1:00 AM daily)'
      },
      {
        name: 'continuity',
        description: 'Stock continuity check - validates stock continuity over the last 7 days',
        schedule: '0 2 * * * (2:00 AM daily)'
      },
      {
        name: 'lowStock',
        description: 'Low stock alert - checks for products below minimum stock level',
        schedule: '0 9 * * * (9:00 AM daily)'
      },
      {
        name: 'healthCheck',
        description: 'Stock health check - provides overall stock health summary',
        schedule: '0 */6 * * * (Every 6 hours)'
      }
    ];

    return jobs;
  }
}

// Create scheduler instance
const scheduler = new StockScheduler();

// Main execution function
const main = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'start':
        scheduler.start();
        // Keep the process running
        process.on('SIGINT', () => {
          console.log('\n🛑 Received SIGINT, stopping scheduler...');
          scheduler.stop();
          mongoose.connection.close();
          process.exit(0);
        });
        break;
        
      case 'stop':
        scheduler.stop();
        await mongoose.connection.close();
        break;
        
      case 'status':
        const status = scheduler.getStatus();
        console.log('📊 Scheduler Status:');
        console.log(JSON.stringify(status, null, 2));
        await mongoose.connection.close();
        break;
        
      case 'run':
        const jobName = args[1];
        if (!jobName) {
          console.log('❌ Please specify a job name');
          console.log('Available jobs:', scheduler.listJobs().map(j => j.name).join(', '));
          await mongoose.connection.close();
          return;
        }
        const result = await scheduler.runJob(jobName);
        console.log('📋 Job Result:');
        console.log(JSON.stringify(result, null, 2));
        await mongoose.connection.close();
        break;
        
      case 'list':
        const jobs = scheduler.listJobs();
        console.log('📋 Available Jobs:');
        jobs.forEach(job => {
          console.log(`\n${job.name}:`);
          console.log(`  Description: ${job.description}`);
          console.log(`  Schedule: ${job.schedule}`);
        });
        await mongoose.connection.close();
        break;
        
      default:
        console.log('Usage: node scheduler.js [command] [options]');
        console.log('Commands:');
        console.log('  start                 - Start the scheduler');
        console.log('  stop                  - Stop the scheduler');
        console.log('  status                - Get scheduler status');
        console.log('  run [job_name]        - Run a specific job manually');
        console.log('  list                  - List all available jobs');
        console.log('Examples:');
        console.log('  node scheduler.js start');
        console.log('  node scheduler.js run daily');
        console.log('  node scheduler.js status');
        await mongoose.connection.close();
        break;
    }
    
  } catch (error) {
    console.error('❌ Scheduler execution failed:', error);
    await mongoose.connection.close();
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = StockScheduler;
