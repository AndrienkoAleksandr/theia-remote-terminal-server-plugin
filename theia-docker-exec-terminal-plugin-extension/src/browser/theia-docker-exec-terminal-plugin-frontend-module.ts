import { TheiaDockerExecTerminalPluginCommandContribution, TheiaDockerExecTerminalPluginMenuContribution } from './theia-docker-exec-terminal-plugin-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions, RemoteTerminalWidgetOptions } from "./remote-terminal-widget"; 

import { ContainerModule, Container } from "inversify";
import { WidgetFactory, ApplicationShell } from '@theia/core/lib/browser';
import { TerminalQuickOpenService } from "./terminal-quick-open"

import '../../src/browser/terminal.css';
import 'xterm/lib/xterm.css';

export default new ContainerModule(bind => {

    bind(CommandContribution).to(TheiaDockerExecTerminalPluginCommandContribution);
    bind(MenuContribution).to(TheiaDockerExecTerminalPluginMenuContribution);

    bind(TerminalQuickOpenService).toSelf();

    bind(RemoteTerminalWidget).toSelf().inTransientScope();

    var terminalNum = 0;
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: REMOTE_TERMINAL_WIDGET_FACTORY_ID,
        createWidget: (options: RemoteTerminalWidgetFactoryOptions) => {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = ctx.container;
            const counter = terminalNum++;
            child.bind(RemoteTerminalWidgetOptions).toConstantValue({
                // endpoint: { path: terminalsPath },
                id: 'remote-terminal-' + counter,
                caption: 'Remote terminal ' + counter,
                label: 'Remote terminal ' + counter,
                destroyTermOnClose: true,
                ...options
            });
            const result = child.get(RemoteTerminalWidget);

            const shell = ctx.container.get(ApplicationShell);
            shell.addWidget(result, { area: 'bottom' });
            shell.activateWidget(result.id);
            return result;
        }
    }));
});