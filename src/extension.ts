// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import WebSocket from 'websocket-as-promised';
import { w3cwebsocket as W3C } from 'websocket';
import Options from 'websocket-as-promised/types/options';
import { exec, execFile } from 'child_process';
import { dirname } from 'path';

const wsConfig: Options = {
  createWebSocket: (url:string) => new W3C(url),
  connectionTimeout: 10000,
};

const baseUrl = 'ws://localhost:24892/';
const executeUrl = `${baseUrl}execute`;
const attachUrl = `${baseUrl}attach`;

const executeWS = new WebSocket(executeUrl, wsConfig);
const attachWS = new WebSocket(attachUrl, wsConfig);

let socketnapseStatus: vscode.StatusBarItem;
let socketnapseExecuteButton: vscode.StatusBarItem;
let socketnapseOpenButton: vscode.StatusBarItem;
let socketnapseAttachButton: vscode.StatusBarItem;
let socketnapseAttachLogOutput: vscode.OutputChannel;
let socketnapseExecuteLogOutput: vscode.OutputChannel;

const statusText = (text: string, icon?: string) => {
  socketnapseStatus.text = `${icon ? `$(${icon})` : ''} Synapse: ${text}`;
};

const recursiveExecuteOpen = () => {
  executeWS.open()
    .then()
    .catch(recursiveExecuteOpen);
};

const recursiveAttachOpen = () => {
  statusText('Waiting for Synapse X...', 'loading~spin');
  attachWS.open()
    .then(() => statusText('Connected!', 'check'))
    .catch(recursiveAttachOpen);
};

executeWS.onMessage.addListener((message:string) => {
  socketnapseExecuteLogOutput.appendLine(`Received: ${message}`);
  switch (message) {
    case 'NOT_READY':
      statusText('Not attached!');
      break;

    case 'OK':
      statusText('Executed!');
      break;

    default:
      statusText(`${message}`);
  }
});

attachWS.onMessage.addListener((message:string) => {
  socketnapseAttachLogOutput.appendLine(`Received: ${message}`);
  switch (message) {
    case 'INJECTING':
      statusText('Attaching...', 'loading~spin');
      break;

    case 'CHECK_WL':
      statusText('Checking whitelist...', 'loading~spin');
      break;

    case 'SCANNING':
      statusText('Scanning...', 'loading~spin');
      break;

    case 'READY':
      statusText('Attached!', 'check-all');
      break;

    case 'ATTEMPTING':
      statusText('Attempting...', 'loading~spin');
      break;

    case 'FAILED_TO_FIND':
      statusText('Failed to find Roblox!', 'error');
      break;

    case 'ALREADY_ATTACHED':
      statusText('Already attached!', 'check-all');
      break;

    default:
      statusText(`${message}`, 'warning');
      break;
  }
});

executeWS.onClose.addListener(recursiveExecuteOpen);
attachWS.onClose.addListener(recursiveAttachOpen);

export function activate(context: vscode.ExtensionContext) {
  socketnapseStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(socketnapseStatus);
  socketnapseStatus.show();

  socketnapseOpenButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(socketnapseOpenButton);
  socketnapseOpenButton.text = '$(window) Open Synapse X';
  socketnapseOpenButton.command = 'socket-napse.openSynapseX';
  socketnapseOpenButton.show();

  socketnapseExecuteButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(socketnapseExecuteButton);
  socketnapseExecuteButton.text = '$(triangle-right) Execute';
  socketnapseExecuteButton.command = 'socket-napse.executeScript';
  socketnapseExecuteButton.show();

  socketnapseAttachButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(socketnapseAttachButton);
  socketnapseAttachButton.text = '$(plug) Attach';
  socketnapseAttachButton.command = 'socket-napse.attachRoblox';
  socketnapseAttachButton.show();

  socketnapseAttachLogOutput = vscode.window.createOutputChannel('Socketnapse Attach Log');
  context.subscriptions.push(socketnapseAttachLogOutput);

  socketnapseExecuteLogOutput = vscode.window.createOutputChannel('Socketnapse Execute Log');
  context.subscriptions.push(socketnapseExecuteLogOutput);

  socketnapseAttachLogOutput.show();
  socketnapseExecuteLogOutput.show();

  recursiveExecuteOpen();
  recursiveAttachOpen();

  const executeScriptCommand = vscode.commands.registerCommand('socket-napse.executeScript', () => {
    if (!executeWS.isOpened) {
      vscode.window.showErrorMessage('Please open Synapse X!');
      return;
    }

    const editor = vscode.window.activeTextEditor!;
    executeWS.send(editor.document.getText());
  });

  const attachRobloxCommand = vscode.commands.registerCommand('socket-napse.attachRoblox', () => {
    if (!attachWS.isOpened) {
      vscode.window.showErrorMessage('Please open Synapse X!');
      return;
    }

    attachWS.send('ATTACH');
  });

  const openSynapseXCommand = vscode.commands.registerCommand('socket-napse.openSynapseX', () => {
    const path = vscode.workspace
      .getConfiguration('socket-napse')
      .get<string>('synapseX.executablePath');

    console.log(path);

    if (path && /\S/.test(path)) {
      execFile(path, {
        cwd: dirname(path),
      });
    } else {
      vscode.window.showOpenDialog({
        canSelectFolders: false,
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'EXE files (*.exe)': ['exe'] },
        openLabel: 'Select Synapse X',
        title: 'Select Synapse X',
      }).then((e) => {
        if (e) {
          const pathName = e[0].fsPath;
          execFile(pathName, {
            cwd: dirname(pathName),
          });
        }
      });
    }
  });

  const killRobloxCommand = vscode.commands.registerCommand('socket-napse.killRoblox', () => {
    exec('taskkill /f /im RobloxPlayerBeta.exe');
  });

  context.subscriptions.push(executeScriptCommand);
  context.subscriptions.push(attachRobloxCommand);
  context.subscriptions.push(openSynapseXCommand);
  context.subscriptions.push(killRobloxCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {
  socketnapseStatus.dispose();
  if (executeWS.isOpened) {
    executeWS.close();
  }

  if (attachWS.isOpened) {
    attachWS.close();
  }
}
