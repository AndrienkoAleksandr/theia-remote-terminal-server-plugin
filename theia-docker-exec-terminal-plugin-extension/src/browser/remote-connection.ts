import { injectable } from "inversify";
import { WebSocketConnectionProvider } from "@theia/core/lib/browser";

@injectable()
export class RemoteWebSocketConnectionProvider extends WebSocketConnectionProvider {

    constructor() {
        super();
    }

    /**
     * Creates a websocket URL to the current location
     */
    createWebSocketUrl(path: string): string {
        // use the same remote url
        console.log(path);
        return path;
    }
}
