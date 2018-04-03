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

import { injectable, inject } from "inversify";
import { WorkspaceClient } from "../workspace/workspace-client";

export type TerminalApiEndPointProvider = () => Promise<string>;

@injectable()
export class TerminalApiEndPoint {

    constructor(@inject(WorkspaceClient) protected readonly wsClient: WorkspaceClient) {
    }

    public async getUrl(serverName: string): Promise<string> {
        const remoteTermServer = await this.wsClient.findRemoteServer(serverName);
        return remoteTermServer.url;
    }
}
