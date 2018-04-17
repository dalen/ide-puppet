import { AutoLanguageClient } from "atom-languageclient";
import * as net from "net";
import * as cp from "child_process";
import * as path from "path";
import { promisify } from "es6-promisify";
import * as retryConnect from "net-retry-connect";
import * as atomDeps from "atom-package-deps";
import * as getPort from "get-port";

atomDeps.install("ide-puppet");

class PuppetLanguageClient extends AutoLanguageClient {
  // Platform specific Ruby path
  static defaultPuppetRubyPath() {
    switch (process.platform) {
      case "win32":
        const programFiles = process.env.ProgramFiles;
        if (programFiles == undefined) {
          atom.notifications.addError(`Can't find default Ruby path`, {
            dismissable: true
          });
          return undefined;
        }
        return path.join(programFiles, "Puppet Labs", "Puppet", "sys", "ruby");
      default:
        return "/opt/puppetlabs/puppet/bin/ruby";
    }
  }

  getGrammarScopes() {
    return ["source.puppet"];
  }
  getLanguageName() {
    return "Puppet";
  }
  getServerName() {
    return "Puppet Language Server";
  }

  startServerProcess() {
    const connectionType = atom.config.get("ide-puppet.connectionType");
    if (connectionType === "socket") {
      return this.spawnSocketServer();
    } else if (connectionType === "stdio") {
      return this.spawnServer();
    }
    atom.notifications.addError(
      `Invalid ide-puppet.connectionType: ${connectionType}`,
      {
        dismissable: true
      }
    );
    return this.spawnServer();
  }

  spawnServer(...args: string[]) {
    const rubyPath =
      atom.config.get("ide-puppet.puppetRubyPath") === ""
        ? PuppetLanguageClient.defaultPuppetRubyPath()
        : atom.config.get("ide-puppet.puppetRubyPath");

    const childProcess = cp.spawn(rubyPath, [
      path.resolve(__dirname, "..", "server", "puppet-languageserver"),
      ...args
    ]);

    childProcess.on("error", err =>
      atom.notifications.addError(
        "Unable to start the Puppet language server.",
        {
          dismissable: true,
          description: err.toString()
        }
      )
    );

    return childProcess;
  }

  async getFreePort() {
    const port = await getPort();
    this.logger.debug(`Selected port for local language server: ${port}`);
    return port;
  }

  async spawnSocketServer() {
    const port = await this.getFreePort();
    const childProcess = await this.spawnServer(`--port=${port}`);
    // Retry connecting for up to 10s until we get a connection
    const retryConnectPromise = promisify(retryConnect.to);
    this.socket = await retryConnectPromise({ port, host: "127.0.0.1" });
    return childProcess;
  }
}

export default new PuppetLanguageClient();
