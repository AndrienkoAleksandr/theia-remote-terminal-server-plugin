import { TheiaDockerExecTerminalPluginCommandContribution, TheiaDockerExecTerminalPluginMenuContribution } from './theia-docker-exec-terminal-plugin-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions, RemoteTerminalWidgetOptions } from "./remote-terminal-widget"; 

import { Container, AsyncContainerModule, interfaces, ContainerModule } from "inversify";
import { WidgetFactory, ApplicationShell } from '@theia/core/lib/browser';
import { TerminalQuickOpenService } from "./terminal-quick-open";
import { IBaseTerminalServer, manageTerminalPath } from './base-terminal-protocol';
import { } from './remote'
import { RemoteWebSocketConnectionProvider } from './remote-connection'
import { WorkspaceClient } from './workspace/workspace-client';

export default new ContainerModule(bind => {
    const container = new Container();
    
    container.bind(CommandContribution).to(TheiaDockerExecTerminalPluginCommandContribution);
    container.bind(MenuContribution).to(TheiaDockerExecTerminalPluginMenuContribution);
    container.bind(TerminalQuickOpenService).toSelf();
    container.bind(RemoteWebSocketConnectionProvider).toSelf();
    container.bind(WorkspaceClient).toSelf().inSingletonScope();

    container.bind(RemoteTerminalWidget).toSelf().inTransientScope();

    var terminalNum = 0;
    container.bind(WidgetFactory).toDynamicValue(ctx => ({
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

    container.bind(IBaseTerminalServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(RemoteWebSocketConnectionProvider);
        return connection.createProxy<IBaseTerminalServer>(manageTerminalPath);
    }).inSingletonScope();


    const asynModule = new AsyncContainerModule(
        async (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
            console.log("to be or not to be");
            let server = await container.resolve(WorkspaceClient).findTerminalServer();
            container.bind<string>("url").toConstantValue(server.url);
            console.log("to be or not to be");
    });
    container.loadAsync(asynModule);
});
