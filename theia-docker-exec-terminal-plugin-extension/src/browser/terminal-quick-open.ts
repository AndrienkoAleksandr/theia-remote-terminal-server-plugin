import { injectable, inject } from "inversify"
import { QuickOpenService, QuickOpenModel, QuickOpenItem } from '@theia/core/lib/browser/quick-open/';
import { QuickOpenMode, QuickOpenOptions, WidgetManager } from "@theia/core/lib/browser";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions } from "./remote-terminal-widget";
import { getRestApi, IWorkspace, IRequestError } from "workspace-client";
import { IBaseEnvVariablesServer } from "env-variables-extension/lib/common/base-env-variables-protocol";
import { terminalAttachUrl } from "./base-terminal-protocol";

//todo Global todo. Clean terminal restore information on stop workspace.
@injectable()
export class TerminalQuickOpenService {

    constructor(@inject(QuickOpenService) private readonly quickOpenService: QuickOpenService,
                @inject(WidgetManager) private readonly widgetManager: WidgetManager,
                @inject(IBaseEnvVariablesServer) protected readonly baseEnvVariablesServer: IBaseEnvVariablesServer,) {
    }

    async openTerminal(): Promise<void> {
        const workspaceId = await this.baseEnvVariablesServer.getEnvValueByKey("CHE_WORKSPACE_ID");
        //const cheHost = await this.baseEnvVariablesServer.getEnvValueByKey("CHE_HOST");

        const machines = await this.getListMachines(workspaceId);
        if (machines) {
            const items: QuickOpenItem[] = machines.map<NewTerminalItem>((machineName, id) => {
                return new NewTerminalItem(machineName, newTermItemFunc => this.createNewTerminal(newTermItemFunc.machineName));
            });

            this.open(items, "Select machine to create new terminal");
        }
    }

    private async getListMachines(workspaceId: string): Promise<Array<string>> {
        let machineNames: string[] = [];

        if (!workspaceId) {
            return machineNames;
        }

        const baseUrl = await this.baseEnvVariablesServer.getEnvValueByKey("CHE_API");
        const restClient = getRestApi({
            baseUrl: baseUrl
        });

        return new Promise<string[]>( (resolve, reject) => {
            restClient.getById<IWorkspace>(workspaceId)
            .catch((reason: IRequestError) => {
                console.log("Failed to get workspace by ID: ", workspaceId, "Status code: ", reason.status);
                reject(reason.message);
            })
            .then((workspace: IWorkspace) => {
                if (workspace.runtime) {
                   for(let machine in workspace.runtime.machines) {
                     machineNames.push(machine)
                   }
                }
                resolve(machineNames);
            });
        });
    }

    private getOpts(placeholder: string, fuzzyMatchLabel: boolean = true):QuickOpenOptions {
        return QuickOpenOptions.resolve({
            placeholder,
            fuzzyMatchLabel,
            fuzzySort: false
        });
    }

    private open(items: QuickOpenItem | QuickOpenItem[], placeholder: string): void {
        this.quickOpenService.open(this.getModel(Array.isArray(items) ? items : [items]), this.getOpts(placeholder));
    }

    private getModel(items: QuickOpenItem | QuickOpenItem[]): QuickOpenModel {
        return {
            onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                acceptor(Array.isArray(items) ? items : [items]);
            }
        };
    }

    protected async createNewTerminal(machineName: string): Promise<void> {
        let workspaceId:string = await this.baseEnvVariablesServer.getEnvValueByKey("CHE_WORKSPACE_ID");
        const widget = <RemoteTerminalWidget>await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <RemoteTerminalWidgetFactoryOptions>{
            created: new Date().toString(),
            machineName: machineName,
            workspaceId: workspaceId,
            endpoint: terminalAttachUrl
        });
        widget.start();
    }
}

export class NewTerminalItem extends QuickOpenItem {

    constructor(
                protected readonly _machineName: string,
                private readonly execute: (item: NewTerminalItem) => void
            ) {
        super({
            label: _machineName,
            //description: 'e.g. dev-machine'
        });
    }

    get machineName():string {
        return this._machineName;
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);

        return true;
    }
}
