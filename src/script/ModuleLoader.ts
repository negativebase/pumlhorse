import { Script } from './Script';
import * as path from 'path';
import * as _ from 'underscore';
import enforce from '../util/enforce';
import { Module } from "./Modules";

const requireFromPath = require('../../util/requireFromPath');

export class ModuleLoader {

    static load(fileName: string, modules: string[]): Module[] {
        if (modules == null) return [];

        const scriptDir = path.dirname(fileName);
        return _.map(modules, (mod) => this.resolveModule(mod, scriptDir));
    }

    static getModuleLocator(moduleDescriptor: string | Object): ModuleLocator {
        enforce(moduleDescriptor).isNotNull();

        if (_.isString(moduleDescriptor)) {
            return new ModuleLocator(<string>moduleDescriptor.toString());
        }
        else if (_.isObject(moduleDescriptor)) {
            const keys = Object.keys(moduleDescriptor);
            if (keys.length > 1) throw new Error('Invalid module format: each module must be a separate item');

            return new ModuleLocator(keys[0].toString(), moduleDescriptor[keys[0]].toString());
        }

        throw new Error('Invalid module format: must be a string or an object');
    }

    private static _resolver = requireFromPath;
    static useResolver(resolver: (modDescriptor: any, directory: string) => Module) {
        ModuleLoader._resolver = resolver;
    }

    private static resolveModule(modDescriptor: any, directory: string): Module {
        const moduleLocator = this.getModuleLocator(modDescriptor);

        if (_.some(Script.StandardModules, mod => mod == moduleLocator.name)) {
            return undefined;
        }
        return ModuleLoader._resolver(moduleLocator.path, directory, ['puml_modules']);
    }
}

export class ModuleLocator {
    readonly namespace: string;
    readonly name: string;
    readonly path: string;
    readonly hasNamespace: boolean;

    constructor(descriptor: string, knownPath?: string) {
        if (descriptor.indexOf('=') > -1) {
            const parts = descriptor.split('=', 2);
            this.namespace = parts[0].trim();
            this.name = parts[1].trim();
        }
        else {
            this.name = descriptor;
        }
        this.path = knownPath == null ? this.name : knownPath;
        this.hasNamespace = this.namespace != null;
    }
}