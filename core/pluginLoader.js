const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const plugins = {};

function loadPlugins(pluginDir = path.join(__dirname, '..', 'plugins')) {
  console.log(chalk.blue(`[PLUGIN LOADER] Loading plugins from ${pluginDir}`));
  
  const categories = fs.readdirSync(pluginDir);
  
  for (const category of categories) {
    const categoryPath = path.join(pluginDir, category);
    if (fs.statSync(categoryPath).isDirectory()) {
      const files = fs.readdirSync(categoryPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const pluginPath = path.join(categoryPath, file);
          try {
            const plugin = require(pluginPath);
            if (plugin && plugin.command && typeof plugin.run === 'function') {
              const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
              for (const cmd of commands) {
                plugins[cmd] = plugin;
              }
              console.log(chalk.green(`[PLUGIN LOADED] ${file} → ${commands.join(', ')}`));
            } else {
              console.log(chalk.yellow(`[SKIPPED] ${file} is missing 'command' or 'run'`));
            }
          } catch (err) {
            console.log(chalk.red(`[FAILED] ${file} → ${err.message}`));
          }
        }
      }
    }
  }
  
  console.log(chalk.blue(`[PLUGIN LOADER] Finished loading ${Object.keys(plugins).length} commands.`));
  return plugins;
}

module.exports = { loadPlugins };