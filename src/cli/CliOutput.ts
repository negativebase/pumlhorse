import { IProfile } from '../profile/IProfile';
import { ISessionOutput } from '../profile/ISessionOutput';
import * as loggers from '../script/loggers';
const colors = require('colors');

export class CliOutput implements ISessionOutput {

    private scriptLogs = {};

    constructor(private profile: IProfile) {

    }

    onSessionFinished(passed, failures) {
        const totalCount = passed + failures;
        if (totalCount == 0) {
            loggers.log('0 scripts run. No .puml files found')
        }
        else {
            
            loggers.log('%s scripts run, %s', 
                totalCount,
                failures == 0 
                    ? '0 failures'
                    : colors.red(failures + (failures == 1 ? ' failure' : ' failures')));
        }
    }
    
    onScriptPending(id: string, fileName: string, scriptName: string) {
        this.scriptLogs[id] = new BufferedLogger(fileName, scriptName);
    }

    onScriptFinished(id, err) {
        const logger = this.scriptLogs[id];
        if (err) {
            const lineNumber = err.lineNumber ? 'Line ' + err.lineNumber + ': ' : '';
            logger.log('error', lineNumber + (err.message ? err.message : err));
            if (this.profile.isVerbose && err.stack != null) {
                logger.log('error', lineNumber + err.stack);
            }
            logger.log('error', 'SCRIPT FAILED');
        }
        this.scriptLogs[id].flush();
    }

    onLog(id, level, message) {
        this.scriptLogs[id].log(level, message)
    }

    onSessionStarted() {}
    onScriptStarted()  {}
    onHttpSent() {}
    onHttpReceived() {}
}

class LogMessage {
    constructor(public message: string, public logger: Function) {}
}

class BufferedLogger {
    private messages: LogMessage[] = [];

    constructor(private fileName: string, private scriptName: string) {
        
    }
    
    flush() {
        if (this.messages.length > 0) {
            loggers.log('--------------');
            loggers.log(`## ${this.scriptName} - ${this.fileName} ##`);
            for (let i = 0; i < this.messages.length; i++) {
                let m = this.messages[i];
                m.logger(m.message)
            }
        }
    }
    
    log(level, message) {
        let logger: Function = loggers.log;
        if (level == 'log') {
        }
        else if (level == 'warn') {
            logger = loggers.warn;
        }
        else if (level == 'error') {
            logger = loggers.error;
        }
                
        this.messages.push(new LogMessage(message, logger));
    }
}