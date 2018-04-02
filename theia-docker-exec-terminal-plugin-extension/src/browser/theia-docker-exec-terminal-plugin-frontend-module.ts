/*
 * Copyright (c) 2018-2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
import { ExecTerminalPluginCommandContribution, ExecTerminalPluginMenuContribution } from './contribution/theia-docker-exec-terminal-plugin-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { RemoteTerminalWidget, REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions, RemoteTerminalWidgetOptions } from "./widget/remote-terminal-widget"; 
import { ContainerModule, Container } from "inversify";
import { WidgetFactory, ApplicationShell } from '@theia/core/lib/browser';
import { TerminalQuickOpenService } from "./contribution/terminal-quick-open";
import { IBaseTerminalServer, remoteServerName, manageTerminalPathSegment } from './server-definition/base-terminal-protocol';
import { } from './remote'
import { RemoteWebSocketConnectionProvider } from './server-definition/remote-connection'
// import { TerminalApiEndPointProvider } from './server-definition/remote-terminal-path-provider'
import { WorkspaceClient } from './workspace/workspace-client';

export default new ContainerModule(bind => {
    bind(CommandContribution).to(ExecTerminalPluginCommandContribution);
    bind(MenuContribution).to(ExecTerminalPluginMenuContribution);

    bind(TerminalQuickOpenService).toSelf();
    bind(RemoteWebSocketConnectionProvider).toSelf();

    bind(RemoteTerminalWidget).toSelf().inTransientScope();

    // bind(TerminalApiEndPoint).toSelf();
    bind(WorkspaceClient).toSelf();

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
            const result = child.get<any>(RemoteTerminalWidget);

            const shell = ctx.container.get(ApplicationShell);
            shell.addWidget(result, { area: 'bottom' });
            shell.activateWidget(result.id);
            return result;
        }
    }));

    // bind<string>("remoteTerminalApiEndPoint").toProvider(TerminalApiEndPointProvider)

    //     .getUrl(remoteServerName + manageTerminalPathSegment);
    // )

    bind(IBaseTerminalServer).toDynamicValue((ctx) => {
        const connection = ctx.container.get(RemoteWebSocketConnectionProvider);
        const manageRemotTermUrl: string = ctx.container.get<string>("remoteTerminalApiEndPoint");
        return connection.createProxy<IBaseTerminalServer>(manageRemotTermUrl);
    }).inSingletonScope();
});
