/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from "inversify";
import { Disposable, ILogger } from '@theia/core/lib/common';
import { Widget, BaseWidget, Message, WebSocketConnectionProvider, StatefulWidget, isFirefox } from '@theia/core/lib/browser'; // WebSocketConnectionProvider, StatefulWidget
// import { IShellTerminalServer } from '../common/shell-terminal-protocol';
// import { ITerminalServer } from '../common/terminal-protocol';
// import { IBaseTerminalErrorEvent, IBaseTerminalExitEvent } from '../common/base-terminal-protocol';
// import { TerminalWatcher } from '../common/terminal-watcher';
import * as Xterm from 'xterm';
import { ThemeService } from "@theia/core/lib/browser/theming";
import { IBaseEnvVariablesServer } from "@oandriie/env-variables-extension/lib/common/base-env-variables-protocol";
import { IBaseTerminalServer, ResizeParam } from "./base-terminal-protocol";
import { Deferred } from "@theia/core/lib/common/promise-util";

Xterm.Terminal.applyAddon(require('xterm/lib/addons/fit/fit'));
Xterm.Terminal.applyAddon(require('xterm/lib/addons/attach/attach'));

export const REMOTE_TERMINAL_WIDGET_FACTORY_ID = 'remote-terminal';

export const RemoteTerminalWidgetOptions = Symbol("TerminalWidgetOptions");
export interface RemoteTerminalWidgetOptions {
    machineName: string,
    workspaceId: string,
    // endpoint: Endpoint.Options,
    endpoint: string,
    id: string,
    caption: string,
    label: string
    destroyTermOnClose: boolean
}

export interface RemoteTerminalWidgetFactoryOptions extends Partial<RemoteTerminalWidgetOptions> {
    /* a unique string per terminal */
    created: string
}

interface TerminalCSSProperties {
    /* The font family (e.g. monospace).  */
    fontFamily: string;

    /* The font size, in number of px.  */
    fontSize: number;

    /* The text color, as a CSS color string.  */
    foreground: string;

    /* The background color, as a CSS color string.  */
    background: string;
}

@injectable()
export class RemoteTerminalWidget extends BaseWidget implements StatefulWidget {

    private terminalId: number | undefined;
    private term: Xterm.Terminal;
    private cols: number = 80;
    private rows: number = 40;
    private machineName = "dev-machine";
    private workspaceId: string;
    // private endpoint: Endpoint;
    private attacheTerminalEndPoint: string;
    protected restored = false;
    protected closeOnDispose = true;

    protected openAfterShow = false;
    protected isOpeningTerm = false;
    protected isTermOpen = false;

    protected waitForResized = new Deferred<void>();
    protected waitForTermOpened = new Deferred<void>();

    constructor(
        // @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService,
        @inject(WebSocketConnectionProvider) protected readonly webSocketConnectionProvider: WebSocketConnectionProvider,
        @inject(RemoteTerminalWidgetOptions) protected readonly options: RemoteTerminalWidgetOptions,
        @inject(IBaseEnvVariablesServer) protected readonly baseEnvVariablesServer: IBaseEnvVariablesServer,
        @inject(IBaseTerminalServer) protected readonly termServer: IBaseTerminalServer,
        // @inject(IShellTerminalServer) protected readonly shellTerminalServer: ITerminalServer,
        // @inject(TerminalWatcher) protected readonly terminalWatcher: TerminalWatcher,
        @inject(ILogger) protected readonly logger: ILogger
    ) {
        super();

        // this.endpoint = new Endpoint(options.endpoint);
        this.attacheTerminalEndPoint = options.endpoint;
        this.machineName = options.machineName;
        this.workspaceId = options.workspaceId;
        this.id = options.id;
        this.title.caption = options.caption;
        this.title.label = options.label;
        this.title.iconClass = "fa fa-terminal";

        if (options.destroyTermOnClose === true) {
            this.toDispose.push(Disposable.create(() =>
                this.term.destroy()
            ));
        }

        this.title.closable = true;
        this.addClass("terminal-container");

        /* Read CSS properties from the page and apply them to the terminal.  */
        const cssProps = this.getCSSPropertiesFromPage();

        this.term = new Xterm.Terminal({
            cursorBlink: true,
            fontFamily: cssProps.fontFamily,
            fontSize: cssProps.fontSize,
            theme: {
                foreground: cssProps.foreground,
                background: cssProps.background,
                cursor: cssProps.foreground
            },
        });

        this.toDispose.push(ThemeService.get().onThemeChange(c => {
            const changedProps = this.getCSSPropertiesFromPage();
            this.term.setOption('theme', {
                foreground: changedProps.foreground,
                background: changedProps.background,
                cursor: changedProps.foreground
            });
        }));

        this.term.on('title', (title: string) => {
            this.title.label = title;
        });
        if (isFirefox) {
            // The software scrollbars don't work with xterm.js, so we disable the scrollbar if we are on firefox.
            this.waitForTermOpened.promise.then(() => {
                (this.term.element.children.item(0) as HTMLElement).style.overflow = 'hidden';
            });
        }
    }

    storeState(): object {
        this.closeOnDispose = false;
        return { terminalId: this.terminalId, titleLabel: this.title.label };
    }

    restoreState(oldState: object) {
        if (this.restored === false) {
            const state = oldState as { terminalId: number, titleLabel: string };
            /* This is a workaround to issue #879 */
            this.restored = true;
            this.title.label = state.titleLabel;
            this.start(state.terminalId);
        }
    }

    /* Get the font family and size from the CSS custom properties defined in
       the root element.  */

    private getCSSPropertiesFromPage(): TerminalCSSProperties {
        /* Helper to look up a CSS property value and throw an error if it's
           not defined.  */

        function lookup(props: CSSStyleDeclaration, name: string): string {
            /* There is sometimes an extra space in the front, remove it.  */
            const value = htmlElementProps.getPropertyValue(name).trim();
            if (!value) {
                throw new Error(`Couldn\'t find value of ${name}`);
            }

            return value;
        }

        /* Get the CSS properties of <html> (aka :root in css).  */
        const htmlElementProps = getComputedStyle(document.documentElement);

        const fontFamily = lookup(htmlElementProps, '--theia-code-font-family');
        const fontSizeStr = lookup(htmlElementProps, '--theia-code-font-size');
        const foreground = lookup(htmlElementProps, '--theia-ui-font-color1');
        const background = lookup(htmlElementProps, '--theia-layout-color3');

        /* The font size is returned as a string, such as ' 13px').  We want to
           return just the number of px.  */
        const fontSizeMatch = fontSizeStr.trim().match(/^(\d+)px$/);
        if (!fontSizeMatch) {
            throw new Error(`Unexpected format for --theia-code-font-size (${fontSizeStr})`);
        }

        const fontSize = Number.parseInt(fontSizeMatch[1]);

        /* xterm.js expects #XXX of #XXXXXX for colors.  */
        const colorRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

        if (!foreground.match(colorRe)) {
            throw new Error(`Unexpected format for --theia-ui-font-color1 (${foreground})`);
        }

        if (!background.match(colorRe)) {
            throw new Error(`Unexpected format for --theia-layout-color3 (${background})`);
        }

        return {
            fontSize: fontSize,
            fontFamily: fontFamily,
            foreground: foreground,
            background: background,
        };
    }

    protected registerResize(): void {
        this.term.on('resize', size => {
            if (this.terminalId === undefined) {
                return;
            }

            if (!size) {
                return;
            }

            this.cols = size.cols;
            this.rows = size.rows;

            let resizeParam: ResizeParam = {
                id: this.terminalId,
                cols: this.cols,
                rows: this.rows
            };
            console.log("terminal-id=" + resizeParam.id);
            this.termServer.resize(resizeParam);
        });
    }

    /**
     * Create a new remote terminal in the back-end and attach it to a
     * new terminal widget.
     * If id is provided attach to the terminal for this id.
     */
    public async start(id?: number): Promise<void> {
        await this.waitForResized.promise;
        if (id === undefined) {
            console.log("Try to create new terminal!!!");

            let machineExec = {
                identifier: {
                    machineName: this.machineName,
                    workspaceId: this.workspaceId
                },
                cmd: "/bin/bash", //todo arrya ["/bin/bash", "-l"]
                cols: this.cols,
                rows: this.rows,
                tty: true
            };

            this.terminalId = await this.termServer.create(machineExec);
            console.log("Created: ", this.terminalId);
        } else {
            // this.terminalId = await this.shellTerminalServer.attach(id);
        }

        /* An error has occurred in the backend.  */
        if (this.terminalId === -1 || this.terminalId === undefined) {
            this.terminalId = undefined;
            if (id === undefined) {
                this.logger.error("Error creating terminal widget, see the backend error log for more information.  ");
            } else {
                this.logger.error(`Error attaching to terminal id ${id}, the terminal is most likely gone. Starting up a new terminal instead.  `);
                this.start();
            }
            return;
        }
        await this.doResize();
        this.connectTerminalProcess(this.terminalId);
    }

    protected async openTerm(): Promise<void> {
        this.isOpeningTerm = true;

        if (this.isTermOpen === true) {
            this.isOpeningTerm = false;
            return Promise.reject("Already open");
        }

        /* This may have changed since we waited for waitForStarted. Test it again.  */
        if (this.isVisible === false) {
            this.isOpeningTerm = false;
            return Promise.reject("Not visible");
        }

        this.term.open(this.node);
        this.registerResize();
        this.isTermOpen = true;
        this.waitForTermOpened.resolve();
        return this.waitForTermOpened.promise;
    }

    protected async createWebSocket(pid: string): Promise<WebSocket> {
        let url = this.attacheTerminalEndPoint + "/" + this.terminalId;
        return this.webSocketConnectionProvider.createWebSocket(url, { reconnecting: false });
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.isTermOpen) {
            this.term.focus();
        }
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        if (this.openAfterShow) {
            if (this.isOpeningTerm === false) {
                this.openTerm().then(() => {
                    this.openAfterShow = false;
                    this.term.focus();
                }).catch(e => {
                    this.logger.error("Error opening terminal", e.toString());
                });
            }
        } else {
            this.term.focus();
        }
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        if (this.isVisible) {
            this.openTerm().then(() => {
                this.term.focus();
            }).catch(e => {
                this.openAfterShow = true;
                this.logger.error("Error opening terminal", e.toString());
            });
        } else {
            this.openAfterShow = true;
        }
    }

    // tslint:disable-next-line:no-any
    private resizeTimer: any;

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.waitForResized.resolve();
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.waitForTermOpened.promise.then(() => {
                this.doResize();
            });
        }, 50);
    }

    protected connectTerminalProcess(id: number) {
        this.monitorTerminal(id);
        this.connectSocket(id);
    }

    protected monitorTerminal(id: number) {
        // this.toDispose.push(this.terminalWatcher.onTerminalError((event: IBaseTerminalErrorEvent) => {
        //     if (event.terminalId === id) {
        //         this.title.label = "<terminal error>";
        //     }
        // }));

        // this.toDispose.push(this.terminalWatcher.onTerminalExit((event: IBaseTerminalExitEvent) => {
        //     if (event.terminalId === id) {
        //         this.title.label = "<terminated>";
        //     }
        // }));
    }


    protected async connectSocket(id: number) {
        console.log("try to connect!!!!");

        // todo uncommment it !!!!
        const socket = await this.createWebSocket(id.toString());
        console.log("socket !!!!!" + socket);

        socket.onopen = () => {
            console.log("open!!!!")
            this.term.on("data", data => {
                //socket.send(JSON.stringify({"type": "data", "data": data}))
                socket.send(data);
            });
        };

        socket.onmessage = ev => {
            console.log(ev.data);
            this.term.write(ev.data);
        };

        socket.onerror = err => {
            console.error(err);
        };

        socket.onclose = (ev) => {
            this.close();
        }

        this.toDispose.push(Disposable.create(() =>
            socket.close()
        ));
    }

    dispose(): void {
        /* Close the backend terminal only when explicitly closing the terminal
         * a refresh for example won't close it.  */
        if (this.closeOnDispose === true && this.terminalId !== undefined) {
            // this.shellTerminalServer.close(this.terminalId);
        }
        super.dispose();
    }

    private async doResize() {
        await Promise.all([this.waitForResized.promise, this.waitForTermOpened.promise]);
        const geo = (this.term as any).proposeGeometry();
        this.cols = geo.cols;
        this.rows = geo.rows - 1; // subtract one row for margin
        this.term.resize(this.cols, this.rows);
    }
}
