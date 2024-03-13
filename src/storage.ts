import File, { FILES_READY } from './file';
import Dictionary from './dictionary';
import Store from './store';

//import Dictionary from './dictionary';

//const STORAGE_ADD = Symbol('STORAGE_ADD');

export default class Storage
{
    static get File(){ return File }
    static get Dictionary(){ return Dictionary }
    static get Store(){ return Store }

    public static async ready()
    {
        await File[FILES_READY]();
    }

    /*private static index = new Dictionary<{ created: Date }>('@liqd-rn/storage:index');

    static async delete( pattern?: string )
    {
        
    }

    static [STORAGE_ADD]( path: string )
    {

    }*/
}