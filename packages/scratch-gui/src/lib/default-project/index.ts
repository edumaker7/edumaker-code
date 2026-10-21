import projectData from './project-data';
import {TranslatorFunction} from '../../gui-config';


import popWav from '!arraybuffer-loader!./83a9787d4cb6f3b7632b4ddfebf74367.wav?';
import dingWav from '!arraybuffer-loader!./5c34b1619c54df896f6572373f8aaae8.wav?';
import backdrop from '!raw-loader!./cd21514d0531fdffb22204e0ec5ed84a.svg?';
import costume1 from '!raw-loader!./c7c8984c25fcae35b4d9e57754e1f48d.svg?';
import costume2 from '!raw-loader!./c5fec6e46d465112137584b2d24d965d.svg?';


declare function require (path: 'fastestsmallesttextencoderdecoder'): {TextEncoder: typeof TextEncoder};

const defaultProject = (translator?: TranslatorFunction) => {
    let _TextEncoder: typeof TextEncoder;
    if (typeof TextEncoder === 'undefined') {
        _TextEncoder = require('fastestsmallesttextencoderdecoder').TextEncoder;
    } else {
        _TextEncoder = TextEncoder;
    }
    const encoder = new _TextEncoder();

    const projectJson = projectData(translator);
    return [{
        // TODO: This is weird - the ids are annotated by scratch-storage to be strigns, but
        //       this one is an int. May have implications on checking with `!` and in conditions,
        //       so leaving it as is for now.
        id: 0,
        assetType: 'Project',
        dataFormat: 'JSON',
        data: JSON.stringify(projectJson)
    }, {
        id: '83a9787d4cb6f3b7632b4ddfebf74367',
        assetType: 'Sound',
        dataFormat: 'WAV',
        data: new Uint8Array(popWav)
    }, {
        id: '5c34b1619c54df896f6572373f8aaae8',
        assetType: 'Sound',
        dataFormat: 'WAV',
        data: new Uint8Array(dingWav)
    }, {
        id: 'cd21514d0531fdffb22204e0ec5ed84a',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(backdrop)
    }, {
        id: 'c7c8984c25fcae35b4d9e57754e1f48d',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(costume1)
    }, {
        id: 'c5fec6e46d465112137584b2d24d965d',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(costume2)
    }];
};

export default defaultProject;
