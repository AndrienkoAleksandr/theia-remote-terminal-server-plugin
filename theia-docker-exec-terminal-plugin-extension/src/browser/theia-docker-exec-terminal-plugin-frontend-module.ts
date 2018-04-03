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
import { Container, ContainerModule } from "inversify";
import { WidgetFactory, ApplicationShell } from '@theia/core/lib/browser';
import { TerminalQuickOpenService } from "./contribution/terminal-quick-open";
import { remoteServerName} from './server-definition/base-terminal-protocol';
import { } from './remote'
import { RemoteWebSocketConnectionProvider } from './server-definition/remote-connection'
import { WorkspaceClient } from './workspace/workspace-client';
import { TerminalApiEndPoint, TerminalApiEndPointProvider } from './server-definition/remote-terminal-path-provider';
import { IBaseTerminalServerProxyProvider } from "./server-definition/terminal-proxy-provider";
// import { remoteServerName } from './server-definition/base-terminal-protocol';

export default new ContainerModule(bind => {
    bind(CommandContribution).to(ExecTerminalPluginCommandContribution);
    bind(MenuContribution).to(ExecTerminalPluginMenuContribution);

    bind(TerminalQuickOpenService).toSelf();
    bind(RemoteWebSocketConnectionProvider).toSelf();
    bind<IBaseTerminalServerProxyProvider>("IBaseTerminalServerProxyProvider").to(IBaseTerminalServerProxyProvider).inSingletonScope();

    bind(RemoteTerminalWidget).toSelf().inTransientScope();

    bind(TerminalApiEndPoint).toSelf().inSingletonScope();
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

    bind<TerminalApiEndPointProvider>("TerminalApiEndPointProvider").toProvider<string>((context) => {
        return () => {
            return new Promise<string>((resolve, reject) => {
                let termApiEndPoint = context.container.get(TerminalApiEndPoint);
                console.log("remote server name " + remoteServerName)
                termApiEndPoint.getUrl(remoteServerName).then(remoteServerUrl => {
                    resolve(remoteServerUrl);
                }).catch(err => {
                    console.error("Failed to get remote server url ")
                    reject(err);
                })
            });
        };
    });

    //  bind<IBaseTerminalServerProvider>("IBaseTerminalServerProvider").toProvider<IBaseTerminalServer>((context) => {
    //     return () => {
    //         return new Promise<IBaseTerminalServer>((resolve) => {
    //             const connection = context.container.get(RemoteWebSocketConnectionProvider);
    //             console.log("0")
    //             const termApiEndPointProvider = context.container.get<TerminalApiEndPointProvider>("TerminalApiEndPointProvider");
    //             console.log("1");
    //             termApiEndPointProvider().then(termEndPoint => {
    //                 console.log("2");
    //                 const proxy = connection.createProxy<IBaseTerminalServer>(termEndPoint + manageTerminalPathSegment)
    //                 console.log("3 ", proxy);
    //                 resolve(proxy);
    //             }).catch(err => {
    //                 console.error("Failed to create remoter terminal server proxy")
    //                 // reject(err);
    //             })
    //         });
    //     } 
    // });
});

// export default new AsyncContainerModule(
//     async (bind: interfaces.Bind, unbind: interfaces.Unbind) => {

//         //bind(TerminalApiEndPoint).toSelf().inSingletonScope();
        
//         console.log("string!!!!");
//         // const url = await TerminalApiEndPoint.getUrl(remoteServerName);
//         bind("apiEndPointUrl").toDynamicValue(context => {
//             return "rr";
//         });
//         console.log("next");
        
//         // console.log("url " + url)
//         // bind<string>("apiEndPointUrl").toConstantValue(url);


//         bind(CommandContribution).to(ExecTerminalPluginCommandContribution);
//         bind(MenuContribution).to(ExecTerminalPluginMenuContribution);
    
//         bind(TerminalQuickOpenService).toSelf();
//         bind(RemoteWebSocketConnectionProvider).toSelf();
    
//         bind(RemoteTerminalWidget).toSelf().inTransientScope();
    
//         bind(TerminalApiEndPoint).toSelf().inSingletonScope;
//         bind(WorkspaceClient).toSelf();
    
//         var terminalNum = 0;
//         bind(WidgetFactory).toDynamicValue(ctx => ({
//             id: REMOTE_TERMINAL_WIDGET_FACTORY_ID,
//             createWidget: (options: RemoteTerminalWidgetFactoryOptions) => {
//                 const child = new Container({ defaultScope: 'Singleton' });
//                 child.parent = ctx.container;
//                 const counter = terminalNum++;
//                 child.bind(RemoteTerminalWidgetOptions).toConstantValue({
//                     // endpoint: { path: terminalsPath },
//                     id: 'remote-terminal-' + counter,
//                     caption: 'Remote terminal ' + counter,
//                     label: 'Remote terminal ' + counter,
//                     destroyTermOnClose: true,
//                     ...options
//                 });
//                 const result = child.get<any>(RemoteTerminalWidget);
    
//                 const shell = ctx.container.get(ApplicationShell);
//                 shell.addWidget(result, { area: 'bottom' });
//                 shell.activateWidget(result.id);
//                 return result;
//             }
//         }));

//     //    const db = await getDbConn();

//     //    bind("db").toContainerValue(db);
//     }
// );