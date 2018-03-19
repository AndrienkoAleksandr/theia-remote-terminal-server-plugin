export interface IMachineIdentifier {}

export interface IMachineExec {}

export const IBaseTerminalServer = Symbol('IBaseTerminalServer');
export interface IBaseTerminalServer {
    create(machineExec: IMachineExec): Promise<number>;
    attach(id :number): Promise<number>;
    resize(id :string, rows :number, cols :number): Promise<void>;
    kill(id :string): Promise<void>;

    get(id :string): Promise<IMachineExec>;
}

//todo move it to browser