"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_languageclient_1 = require("atom-languageclient");
const cp = require("child_process");
const path = require("path");
const es6_promisify_1 = require("es6-promisify");
const retryConnect = require("net-retry-connect");
const atomDeps = require("atom-package-deps");
const getPort = require("get-port");
atomDeps.install("ide-puppet");
class PuppetLanguageClient extends atom_languageclient_1.AutoLanguageClient {
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
        }
        else if (connectionType === "stdio") {
            return this.spawnServer();
        }
        atom.notifications.addError(`Invalid ide-puppet.connectionType: ${connectionType}`, {
            dismissable: true
        });
        return this.spawnServer();
    }
    spawnServer(...args) {
        const rubyPath = atom.config.get("ide-puppet.puppetRubyPath") === ""
            ? PuppetLanguageClient.defaultPuppetRubyPath()
            : atom.config.get("ide-puppet.puppetRubyPath");
        const childProcess = cp.spawn(rubyPath, [
            path.resolve(__dirname, "..", "server", "puppet-languageserver"),
            ...args
        ]);
        childProcess.on("error", err => atom.notifications.addError("Unable to start the Puppet language server.", {
            dismissable: true,
            description: err.toString()
        }));
        return childProcess;
    }
    getFreePort() {
        return __awaiter(this, void 0, void 0, function* () {
            const port = yield getPort();
            this.logger.debug(`Selected port for local language server: ${port}`);
            return port;
        });
    }
    spawnSocketServer() {
        return __awaiter(this, void 0, void 0, function* () {
            const port = yield this.getFreePort();
            const childProcess = yield this.spawnServer(`--port=${port}`);
            // Retry connecting for up to 10s until we get a connection
            const retryConnectPromise = es6_promisify_1.promisify(retryConnect.to);
            this.socket = yield retryConnectPromise({ port, host: "127.0.0.1" });
            return childProcess;
        });
    }
}
exports.default = new PuppetLanguageClient();
//# sourceMappingURL=main.js.map