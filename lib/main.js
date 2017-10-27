const { AutoLanguageClient } = require('atom-languageclient');
const net = require('net');
const cp = require('child_process');

class PuppetLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ['source.puppet'];
  }
  getLanguageName() {
    return 'Puppet';
  }
  getServerName() {
    return 'Puppet Language Server';
  }

  startServerProcess(projectPath) {
    const childProcess = cp.spawn(atom.config.get('ide-puppet.languageServerPath'), {
      cwd: projectPath,
    });
    childProcess.on('error', err =>
      atom.notifications.addError('Unable to start the Puppet language server.', {
        dismissable: true,
        description: err.toString(),
      }));
    this.socket = net.connect({
      port: atom.config.get('ide-puppet.port'),
      host: '127.0.0.1',
    });
    return childProcess;
  }
}

module.exports = new PuppetLanguageClient();
