import { TheiaDockerExecTerminalPluginCommandContribution, TheiaDockerExecTerminalPluginMenuContribution } from './theia-docker-exec-terminal-plugin-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { TerminalWidget } from "./terminal-widget"; 

import { ContainerModule } from "inversify";

export default new ContainerModule(bind => {

    bind(CommandContribution).to(TheiaDockerExecTerminalPluginCommandContribution);
    bind(MenuContribution).to(TheiaDockerExecTerminalPluginMenuContribution);

    bind(TerminalWidget).toSelf().inTransientScope();
});