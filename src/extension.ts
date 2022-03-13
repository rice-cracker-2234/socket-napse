// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import WebSocket from 'websocket-as-promised';
import { w3cwebsocket as W3C } from 'websocket';
import Options from 'websocket-as-promised/types/options';
import { exec, execFile } from 'child_process';
import { dirname } from 'path';

const wsConfig: Options = {
  createWebSocket: (url) => new W3C(url),
  connectionTimeout: 10000,
};

const baseUrl = 'ws://localhost:24892/';
const executeUrl = `${baseUrl}execute`;
const attachUrl = `${baseUrl}attach`;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const executeWS = new WebSocket(executeUrl, wsConfig);
const attachWS = new WebSocket(attachUrl, wsConfig);

let socketnapseStatus: vscode.StatusBarItem;
let socketnapseAttachLogOutput: vscode.OutputChannel;
let socketnapseExecuteLogOutput: vscode.OutputChannel;

const recursiveExecuteOpen = () => {
  executeWS.open()
    .then()
    .catch(recursiveExecuteOpen);
};

const recursiveAttachOpen = () => {
  socketnapseStatus.text = 'Socketnapse: Waiting for Synapse X...';
  attachWS.open()
    .then(() => { socketnapseStatus.text = 'Socketnapse: Connected!'; })
    .catch(recursiveAttachOpen);
};

executeWS.onMessage.addListener((message) => {
  socketnapseExecuteLogOutput.appendLine(`Received: ${message}`);
  switch (message) {
    case 'NOT_READY':
      vscode.window.showErrorMessage('You haven\'t attached to a Roblox process!');
      break;

    case 'OK':
      vscode.window.showInformationMessage('Script executed!');
      break;

    default:
      vscode.window.showWarningMessage(`Unknown message: ${message}`);
  }
});

attachWS.onMessage.addListener((message) => {
  socketnapseAttachLogOutput.appendLine(`Received: ${message}`);
  switch (message) {
    case 'INJECTING':
      socketnapseStatus.text = 'Socketnapse: Attaching...';
      break;

    case 'CHECK_WL':
      socketnapseStatus.text = 'Socketnapse: Checking whitelist...';
      break;

    case 'SCANNING':
      socketnapseStatus.text = 'Socketnapse: Scanning...';
      break;

    case 'READY':
      socketnapseStatus.text = 'Socketnapse: Attached!';
      break;

    case 'ATTEMPTING':
      socketnapseStatus.text = 'Socketnapse: Attempting...';
      break;

    case 'FAILED_TO_FIND':
      socketnapseStatus.text = 'Socketnapse: Failed to find Roblox!';
      break;

    default:
      socketnapseStatus.text = `Socketnapse: Unknown (${message})`;
      break;
  }
});

executeWS.onClose.addListener(recursiveExecuteOpen);
attachWS.onClose.addListener(recursiveAttachOpen);

export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "socket-napse" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  socketnapseStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(socketnapseStatus);
  socketnapseStatus.show();

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
