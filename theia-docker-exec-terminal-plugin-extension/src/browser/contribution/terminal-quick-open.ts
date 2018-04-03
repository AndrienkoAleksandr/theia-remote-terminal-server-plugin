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
import { injectable, inject } from "inversify"
import { QuickOpenService, QuickOpenModel, QuickOpenItem } from '@theia/core/lib/browser/quick-open/';
import { QuickOpenMode, QuickOpenOptions, WidgetManager } from "@theia/core/lib/browser";
import { TerminalApiEndPointProvider } from "../server-definition/remote-terminal-path-provider";
import { WorkspaceClient } from "../workspace/workspace-client";
// import { terminalAttachUrlSegment } from "../server-definition/base-terminal-protocol";
import { REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions, RemoteTerminalWidget } from "../widget/remote-terminal-widget";
import { terminalAttachUrlSegment } from "../server-definition/base-terminal-protocol";

//todo Global todo. Clean terminal restore information on stop workspace.
@injectable()
export class TerminalQuickOpenService {

    constructor(@inject(QuickOpenService) private readonly quickOpenService: QuickOpenService,
                @inject(WidgetManager) private readonly widgetManager: WidgetManager,
                @inject(WorkspaceClient) private readonly wsClient: WorkspaceClient,
                @inject("TerminalApiEndPointProvider") private readonly termApiEndPointProvider: TerminalApiEndPointProvider,
            ) {
    }

    async openTerminal(): Promise<void> {
        const items: QuickOpenItem[] = [];
        const machines = await this.wsClient.getListMachines();

        for (const machineName in machines) {
            items.push(new NewTerminalItem(machineName, newTermItemFunc => this.createNewTerminal(newTermItemFunc.machineName)));
        }

        if (machines) {
            this.open(items, "Select machine to create new terminal");
        }
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
        const workspaceId = await this.wsClient.getWorkspaceId();
        const termEndPoint: string = await this.termApiEndPointProvider();
        const widget = <RemoteTerminalWidget>await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <RemoteTerminalWidgetFactoryOptions>{
            created: new Date().toString(),
            machineName: machineName,
            workspaceId: workspaceId,
            endpoint: termEndPoint + terminalAttachUrlSegment
        });
        widget.start();
    }
}

export class NewTerminalItem extends QuickOpenItem {

    constructor(
                protected readonly _machineName: string,
                private readonly execute: (item: NewTerminalItem) => void
            ) {
        super({label: _machineName});
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
