import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from "@theia/core/lib/common";
import { CommonMenus } from "@theia/core/lib/browser";

export const TheiaDockerExecTerminalPluginCommand = {
    id: 'TheiaDockerExecTerminalPlugin.command',
    label: "Shows a message"
};

@injectable()
export class TheiaDockerExecTerminalPluginCommandContribution implements CommandContribution {

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TheiaDockerExecTerminalPluginCommand, {
            execute: () => this.messageService.info('Hello World!')
        });
    }
}

@injectable()
export class TheiaDockerExecTerminalPluginMenuContribution implements MenuContribution {

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.FILE, {
            commandId: TheiaDockerExecTerminalPluginCommand.id,
            label: 'Say Hello'
        });
    }
}