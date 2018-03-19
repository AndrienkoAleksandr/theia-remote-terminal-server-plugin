import { IMachineIdentifier, IMachineExec } from "./base-terminal-protocol";

// todo apply context to the server side
export const terminalPath = "ws://localhost:4444/connect";
// export const terminalPort = 4444;

export interface MachineIdentifier extends IMachineIdentifier {
    machineName: string,
    workspaceId: string
}

export interface MachineExec extends IMachineExec  {
    identifier: MachineIdentifier,
    cmd: string,
    pty:boolean,
    cols: number,
    rows: number,
    ide: number
}

//todo move it to browser