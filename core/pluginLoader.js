const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');

// Promisify file system operations for better async handling
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

const plugins = {};
let pluginStats = {
  total: 0,
  loaded: 0,
  failed: 0,
  skipped: 0,
  categories: 0
};

// Enhanced logging function with timestamps
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    debug: chalk.gray
  };
  
  const color = colors[level] || chalk.white;
  console.log(`[${timestamp}] ${color(`[${level.toUpperCase()}]`)} ${chalk.white(message)}`);
  
  if (data) {
    console.log(chalk.gray(JSON.stringify(data, null, 2)));
  }
};

// Validate plugin structure
const validatePlugin = (plugin, fileName) => {
  // Check for required fields
  if (!plugin.command) {
    throw new Error('Missing required field: command');
  }
  
  if (!plugin.run || typeof plugin.run !== 'function') {
    throw new Error('Missing or invalid required field: run (must be a function)');
  }
  
  // Validate command format
  if (typeof plugin.command !== 'string' && !Array.isArray(plugin.command)) {
    throw new Error('Command must be a string or array of strings');
  }
  
  // Set default values for optional fields
  plugin.description = plugin.description || 'No description provided';
  plugin.usage = plugin.usage || '';
  plugin.category = plugin.category || 'general';
  plugin.ownerOnly = plugin.ownerOnly || false;
  plugin.groupOnly = plugin.groupOnly || false;
  plugin.privateOnly = plugin.privateOnly || false;
  plugin.adminOnly = plugin.adminOnly || false;
  plugin.botAdmin = plugin.botAdmin || false;
  plugin.cooldown = plugin.cooldown || 3;
  plugin.aliases = plugin.aliases || [];
  
  return true;
};

// Load plugins with enhanced error handling and validation
async function loadPlugins(pluginDir = path.join(__dirname, '..', 'plugins')) {
  // Clear previous plugins if reloading
  Object.keys(plugins).forEach(key => delete plugins[key]);
  
  // Reset stats
  pluginStats = {
    total: 0,
    loaded: 0,
    failed: 0,
    skipped: 0,
    categories: 0
  };
  
  log('info', `Loading plugins from ${pluginDir}`);
  
  try {
    // Check if plugin directory exists
    if (!fs.existsSync(pluginDir)) {
      log('warn', `Plugin directory not found: ${pluginDir}`);
      fs.mkdirSync(pluginDir, { recursive: true });
      log('info', `Created plugin directory: ${pluginDir}`);
      return plugins;
    }
    
    // Read categories
    const categories = await readdir(pluginDir);
    pluginStats.categories = categories.length;
    
    log('info', `Found ${categories.length} categories`);
    
    for (const category of categories) {
      const categoryPath = path.join(pluginDir, category);
      
      try {
        const stats = await stat(categoryPath);
        
        if (stats.isDirectory()) {
          log('debug', `Processing category: ${category}`);
          
          const files = await readdir(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.js')) {
              pluginStats.total++;
              const pluginPath = path.join(categoryPath, file);
              
              try {
                // Clear require cache for hot reloading
                delete require.cache[require.resolve(pluginPath)];
                
                const plugin = require(pluginPath);
                
                // Validate plugin structure
                if (validatePlugin(plugin, file)) {
                  // Handle main commands
                  const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                  
                  // Handle aliases
                  const allCommands = [...commands, ...plugin.aliases];
                  
                  for (const cmd of allCommands) {
                    if (plugins[cmd]) {
                      log('warn', `Duplicate command '${cmd}' found in ${file}, overriding...`);
                    }
                    plugins[cmd] = {
                      ...plugin,
                      command: cmd,
                      category: category,
                      filePath: pluginPath
                    };
                  }
                  
                  pluginStats.loaded++;
                  log('success', `Loaded: ${category}/${file} → ${allCommands.join(', ')}`);
                } else {
                  pluginStats.skipped++;
                  log('warn', `Skipped: ${file} (validation failed)`);
                }
                
              } catch (err) {
                pluginStats.failed++;
                log('error', `Failed to load ${category}/${file}: ${err.message}`);
              }
            }
          }
        }
      } catch (categoryError) {
        log('error', `Error processing category ${category}: ${categoryError.message}`);
      }
    }
    
    // Log summary
    log('success', `Plugin loading completed:`, {
      total: pluginStats.total,
      loaded: pluginStats.loaded,
      failed: pluginStats.failed,
      skipped: pluginStats.skipped,
      categories: pluginStats.categories
    });
    
    return plugins;
    
  } catch (err) {
    log('error', `Failed to load plugins: ${err.message}`);
    return plugins;
  }
}

// Utility functions for plugin management
const getPluginInfo = (command) => {
  if (plugins[command]) {
    const plugin = plugins[command];
    return {
      command: plugin.command,
      description: plugin.description,
      usage: plugin.usage,
      category: plugin.category,
      ownerOnly: plugin.ownerOnly,
      cooldown: plugin.cooldown,
      aliases: plugin.aliases
    };
  }
  return null;
};

const getAllPlugins = () => {
  return Object.keys(plugins);
};

const getPluginsByCategory = (category) => {
  return Object.values(plugins).filter(plugin => plugin.category === category);
};

const getPluginStats = () => {
  return { ...pluginStats };
};

const reloadPlugin = (command) => {
  if (plugins[command]) {
    const pluginPath = plugins[command].filePath;
    try {
      delete require.cache[require.resolve(pluginPath)];
      const newPlugin = require(pluginPath);
      if (validatePlugin(newPlugin)) {
        plugins[command] = { ...newPlugin, filePath: pluginPath };
        log('success', `Reloaded plugin: ${command}`);
        return true;
      }
    } catch (error) {
      log('error', `Failed to reload plugin ${command}: ${error.message}`);
      return false;
    }
  }
  return false;
};

const searchPlugins = (query) => {
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  for (const [command, plugin] of Object.entries(plugins)) {
    if (command.toLowerCase().includes(lowerQuery) ||
      (plugin.description && plugin.description.toLowerCase().includes(lowerQuery))) {
      results.push({
        command,
        description: plugin.description,
        category: plugin.category
      });
    }
  }
  
  return results;
};

// Export functions
module.exports = {
  loadPlugins,
  getPluginInfo,
  getAllPlugins,
  getPluginsByCategory,
  getPluginStats,
  reloadPlugin,
  searchPlugins,
  plugins
};