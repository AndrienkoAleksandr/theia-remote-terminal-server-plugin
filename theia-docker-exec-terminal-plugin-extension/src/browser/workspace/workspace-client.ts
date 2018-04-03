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
import { getRestApi, IWorkspace, IRequestError, IRemoteAPI, IServer, IMachine } from "workspace-client";
import { IBaseEnvVariablesServer } from "env-variables-extension/lib/common/base-env-variables-protocol";
import { terminalTypeValue } from "../base-terminal-protocol";

@injectable()
export class WorkspaceClient {

    private api: IRemoteAPI;

    constructor(@inject(IBaseEnvVariablesServer) protected readonly baseEnvVariablesServer: IBaseEnvVariablesServer) {
    }

    public async getListMachines(): Promise<{ [attrName: string]: IMachine }> {
        let machines: { [attrName: string]: IMachine } = {};

        const workspaceId = await this.getWorkspaceId();
        const restClient = await this.getRemoteApi();
        if (!workspaceId || !restClient) {
            return machines;
        }

        return new Promise<{ [attrName: string]: IMachine }>( (resolve, reject) => {
            restClient.getById<IWorkspace>(workspaceId)
            .then((workspace: IWorkspace) => {
                if (workspace.runtime) {
                    machines = workspace.runtime.machines;
                }
                resolve(machines);
            })
            .catch((reason: IRequestError) => {
                console.log("Failed to get workspace by ID: ", workspaceId, "Status code: ", reason.status);
                reject(reason.message);
            })
        });
    }

    public async findTerminalServer(): Promise<IServer> {
        const machines = await this.getListMachines();

        for (const machineName in machines) {
            const servers = machines[machineName].servers;
            for (const serverName in servers) {
                let attributes = servers[serverName].attributes;
                if (attributes) {
                    for (const attrName in attributes) {
                        if (attrName == "type" && attributes[attrName] == terminalTypeValue) {
                            return servers[serverName];
                        }
                    }
                }
            }
        }

        return null;
    }

    public async getWorkspaceId(): Promise<string> {
        return await this.baseEnvVariablesServer.getEnvValueByKey("CHE_WORKSPACE_ID");
    }

    // TODO
    // public async getWsMasterApiEndPoint() {
    //     return await this.baseEnvVariablesServer.getEnvValueByKey("CHE_HOST");
    // }

    private async getRemoteApi(): Promise<IRemoteAPI> {
        if (!this.api) {
            const baseUrl = "http://172.19.20.22:8080/api"; //todo await getWsMasterApiEndPoint();
            this.api = getRestApi({
                baseUrl: baseUrl
            });
        }
        return this.api;
    }
}