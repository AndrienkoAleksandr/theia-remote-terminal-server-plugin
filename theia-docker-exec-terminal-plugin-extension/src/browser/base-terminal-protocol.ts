// todo apply context to the server side

const baseTerminalUrl = "ws://localhost:4444"
export const manageTerminalPath = `${baseTerminalUrl}/connect`;
export const terminalAttachUrl = `${baseTerminalUrl}/attach`

export interface MachineIdentifier {
    machineName: string,
    workspaceId: string
}

export interface MachineExec {
    identifier: MachineIdentifier,
    cmd: string,
    tty:boolean,
    cols: number,
    rows: number,
    id?: number
}

export interface ResizeParam {
    id: number,
    rows: number,
    cols: number
}

export const IBaseTerminalServer = Symbol('IBaseTerminalServer');
export interface IBaseTerminalServer {
    create(machineExec: MachineExec): Promise<number>;
    // attach(id :number): Promise<number>;
    resize(resizeParam: ResizeParam): Promise<void>;
    kill(id :string): Promise<void>;

    get(id :string): Promise<MachineExec>;
}

//todo move it to browser