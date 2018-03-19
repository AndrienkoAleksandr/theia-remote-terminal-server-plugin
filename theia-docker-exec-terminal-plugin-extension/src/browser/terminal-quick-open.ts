import { injectable, inject } from "inversify"
import { QuickOpenService, QuickOpenModel, QuickOpenItem } from '@theia/core/lib/browser/quick-open/';
import { QuickOpenMode, QuickOpenOptions, WidgetManager } from "@theia/core/lib/browser";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions } from "./remote-terminal-widget";
// import { getRestClient } from "workspace-client";
// import { IWorkspace } from "workspace-client"
import { IBaseEnvVariablesServer } from "@oandriie/env-variables-extension/lib/common/base-env-variables-protocol";

@injectable()
export class TerminalQuickOpenService {

    constructor(@inject(QuickOpenService) private readonly quickOpenService: QuickOpenService,
                @inject(WidgetManager) private readonly widgetManager: WidgetManager,
                @inject(IBaseEnvVariablesServer) protected readonly baseEnvVariablesServer: IBaseEnvVariablesServer,) {
    }

    async openTerminal(): Promise<void> {
        const items: QuickOpenItem[] = [];

        items.push(new NewTerminalItem("theia", newTermItem => this.createNewTerminal(newTermItem.machineName)));
        items.push(new NewTerminalItem("dev-machine", newTermItem => this.createNewTerminal(newTermItem.machineName)))
        // const workspaceId = await this.baseEnvVariablesServer.getEnvValueByKey("CHE_WORKSPACE_ID");
        // const workspaceIWorkspace: IWorkspace = getRestClient().getById(workspaceId);

        this.open(items, "Select machine to create new terminal");
        Promise.resolve();
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
        const widget = <RemoteTerminalWidget>await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <RemoteTerminalWidgetFactoryOptions>{
            created: new Date().toString(),
            machineName: machineName
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
