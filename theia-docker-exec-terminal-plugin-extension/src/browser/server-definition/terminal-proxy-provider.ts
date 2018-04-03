import { injectable, inject } from "inversify";
import { RemoteWebSocketConnectionProvider } from "./remote-connection";
import { IBaseTerminalServer, manageTerminalPathSegment } from "./base-terminal-protocol";
import { TerminalApiEndPointProvider } from "./remote-terminal-path-provider";

@injectable()
export class IBaseTerminalServerProxyProvider {

    constructor(@inject(RemoteWebSocketConnectionProvider) private readonly connection: RemoteWebSocketConnectionProvider,
                @inject("TerminalApiEndPointProvider") private readonly termApiEndPointProvider: TerminalApiEndPointProvider,
                ) {
    }

    async createProxy(): Promise<IBaseTerminalServer> {
        const termEndPoint: string = await this.termApiEndPointProvider();
        return this.connection.createProxy<IBaseTerminalServer>(termEndPoint + manageTerminalPathSegment);
    }
}
