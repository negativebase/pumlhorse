import { CliLogger } from './CliLogger';
import * as _ from 'underscore';
import * as path from 'path';
import * as minimist from 'minimist';
import { IProfile, Profile } from '../profile/Profile';
import { CliOutput } from './CliOutput';
import { App } from '../App';
import * as fs from '../util/asyncFs';
import { setLogger } from "../script/loggers";


export async function run(args) {
    console.time('Total time');

    const logger = new CliLogger();
    setLogger(logger);
    if (!args) args = []
    else args = args.slice(2)

    const profile = await buildProfile(args);
    if (profile != null) {
        try {
            const app = new App();
            profile.modules.push({ name: 'cliPrompt', path: require.resolve('./prompt')});
            await app.runProfile(profile, new CliOutput(profile, logger));
        }
        catch (err) {
            logger.error(err);
        }
        finally
        {
            console.timeEnd('Total time');
        }
    } 
}

const cliOptions = {
    string: ['context', 'profile'],
    boolean: ['recursive', 'version', 'help', 'verbose'],
    alias: {
        context: 'c',
        profile: 'p',
        recursive: 'r',
        version: 'v',
        help: '?'
    }
}

function showUsage() {
    console.log('Usage: pumlhorse [options] [files_or_dirs]');
    console.log('Options:');
    console.log('  --profile, -p [profile_file]\t\tUse the given profile');
    console.log('  --context, -c [context_files]\t\tUse the given context file(s)');
    console.log('  --max-concurrent [number]\t\tThe maximum number of files to run at the same time');
    console.log('  --recursive, -r\t\t\tCheck for .puml files in subdirectories');
    console.log('  --verbose\t\t\t\tShow more details in output');
    console.log('');
    console.log('  --version, -v\t\t\t\tShow version info');
    console.log('  --help, -?\t\t\t\tShow this usage info');
}

async function buildProfile(args: any[]): Promise<IProfile> {
    
    const options = minimist(args, cliOptions);

    if (options.version) {
        console.log('Pumlhorse: version ' + require('../../package.json').version)
        return null;
    }

    if (options.help) {
        showUsage();
        return null;
    }

    let profile: IProfile;
    if (options.profile == null) {
        profile = new Profile();
    }
    else {
        profile = await readProfileFile(options.profile);
    }
    
    if (profile.include == null && options._ == null) {
        profile.include = ['.'];
    }
    else {
        profile.include = combine(profile.include, options._);
    }

    profile.contexts = combine(profile.contexts, options.context);
    profile.modules = profile.modules == null ? [] : profile.modules;
    profile.isRecursive = override(options.recursive, profile.isRecursive);
    profile.maxConcurrentFiles = override(options['max-concurrent'], profile.maxConcurrentFiles);
    profile.isVerbose = options.verbose;
                    
    return profile;
}

async function readProfileFile(filePath): Promise<IProfile> {
    if (!filePath.endsWith('.pumlprofile')) filePath += '.pumlprofile';
    
    const fullPath = path.resolve(filePath)

    let stat;
    try {
        stat = await fs.stat(fullPath);
    }
    catch (err) {
        throw new Error(`"${filePath}" does not exist`);
    }

    if (!stat.isFile()) {
        throw new Error(`"${filePath}" does not exist`);
    }
    
    const profile = <IProfile>(await fs.readAsYaml(fullPath));

    if (profile == null) { 
        return null;
    }
            
    //Make files relative to profile path
    profile.include = makeRelative(filePath, profile.include)
    profile.modules = makeModulesRelative(filePath, profile.modules)
    profile.filters = makeRelative(filePath, profile.filters)
    profile.contexts = makeRelative(filePath, profile.contexts)
    return profile;
}

function combine(arr1, arr2) {
    if (!arr2) return arr1
    if (!arr1) return arr2
    
    return arr1.concat(arr2)
}

function override(overrideValue, currentValue) {
    return overrideValue != null
        ? overrideValue
        : currentValue;
}

function makeRelative(filePath: string, array) {
    if (array == null) return array;
    
    return _.map(array, m => makeRelativePath(filePath, m));
}

function makeModulesRelative(filePath: string, modules: any) {
    if (modules == null) return modules;

    return _.map(modules, (m) => { 
        return {
            name: m.name,
            path: makeRelativePath(filePath, m.path)
        };
    })
}

function makeRelativePath(filePath: string, filename: string) {
    return path.resolve(path.dirname(filePath), filename.toString())
}