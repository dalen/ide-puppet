const { AutoLanguageClient } = require('atom-languageclient');
const net = require('net');
const cp = require('child_process');
const path = require('path');
const promisify = require('es6-promisify');
const retryConnect = require('net-retry-connect');
require('atom-package-deps').install('ide-puppet');

class PuppetLanguageClient extends AutoLanguageClient {
  // Platform specific Ruby path
  static defaultPuppetRubyPath() {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.ProgramFiles, 'Puppet Labs', 'Puppet', 'sys', 'ruby');
      default:
        return '/opt/puppetlabs/puppet/bin/ruby';
    }
  }

  getGrammarScopes() {
    return ['source.puppet'];
  }
  getLanguageName() {
    return 'Puppet';
  }
  getServerName() {
    return 'Puppet Language Server';
  }

  startServerProcess() {
    const connectionType = atom.config.get('ide-puppet.connectionType');
    if (connectionType === 'socket') {
      return this.spawnSocketServer();
    } else if (connectionType === 'stdio') {
      return this.spawnServer();
    }
    atom.notifications.addError(`Invalid ide-puppet.connectionType: ${connectionType}`, {
      dismissable: true,
    });
    return this.startServer();
  }

  spawnServer(...args) {
    const rubyPath =
      atom.config.get('ide-puppet.puppetRubyPath') === ''
        ? PuppetLanguageClient.defaultPuppetRubyPath()
        : atom.config.get('ide-puppet.puppetRubyPath');

    const childProcess = cp.spawn(rubyPath, [
      path.resolve(__dirname, '..', 'server', 'puppet-languageserver'),
      ...args,
    ]);

    childProcess.on('error', err =>
      atom.notifications.addError('Unable to start the Puppet language server.', {
        dismissable: true,
        description: err.toString(),
      }));

    return childProcess;
  }

  async getFreePort() {
    const server = net.createServer();
    await promisify(server.listen, server)(0);
    const { port } = server.address();
    this.logger.debug(`Selected port for local language server: ${port}`);
    await promisify(server.close, server)();
    return port;
  }

  async spawnSocketServer() {
    const port = await this.getFreePort();
    const childProcess = await this.spawnServer(`--port=${port}`);
    // Retry connecting for up to 10s until we get a connection
    this.socket = await promisify(retryConnect.to)({ port, host: '127.0.0.1' });
    return childProcess;
  }
}

module.exports = new PuppetLanguageClient();
