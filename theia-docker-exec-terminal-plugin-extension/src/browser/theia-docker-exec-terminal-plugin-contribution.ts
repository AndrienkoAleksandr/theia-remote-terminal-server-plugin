import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from "@theia/core/lib/common";
import { CommonMenus, SingleTextInputDialog, WidgetManager } from "@theia/core/lib/browser";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions } from "./remote-terminal-widget";

export const NewRemoteTerminal = {
    id: 'NewRemoteTerminal',
    label: 'New remote terminal'
}

@injectable()
export class TheiaDockerExecTerminalPluginCommandContribution implements CommandContribution {

    constructor(
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(NewRemoteTerminal, {
            execute: () => { 
                console.log("new remote terminal");
                const dialog = new SingleTextInputDialog({
                    title: `New Remote Terminal`,
                    initialValue: '',
                    // validate: name => this.validateFileName(name, parent)
                });
                dialog.open().then(endpoint => {
                    this.newRemoteTerminal(endpoint);
                });
            }
        }); 
    }

    protected async newRemoteTerminal(endpoint: string): Promise<void> {
        const widget = <RemoteTerminalWidget>await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <RemoteTerminalWidgetFactoryOptions>{
            created: new Date().toString(),
            endpoint: endpoint
        });
        widget.start();
    }
}

@injectable()
export class TheiaDockerExecTerminalPluginMenuContribution implements MenuContribution {

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.FILE, {
            commandId: NewRemoteTerminal.id,
            label: NewRemoteTerminal.label
        });
    }
}