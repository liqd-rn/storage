import { objectStringify } from '@liqd-js/fast-object-hash';
import RNSecureStorage, { ACCESSIBLE } from 'rn-secure-storage';
import RNFetchBlob from 'react-native-blob-util';

const B64CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64URL( str: string ): string
{
    let result = '';
  
    for( let i = 0; i < str.length; i += 3 )
    {
        let chunk = str.slice( i, i + 3 ).split('')
            .map( char => char.charCodeAt(0).toString(2).padStart(8, '0'))
            .join('').padEnd( 24, '0' )
            .match(/.{1,6}/g)!.map( s => B64CHARS[parseInt(s, 2)])
            .join('');

        if( i + 3 > str.length ){ chunk = chunk.slice( 0, chunk.length - ( 3 - ( str.length - i )))}

        result += chunk;
    }
  
    return result;
}

export type FileOptions =
{
    format      : /*'binary' |*/ 'string' | 'json'
    type?       : 'object' | 'array'
    encrypted?  : boolean
}

export const FILES_READY = Symbol('FILES_READY');
export const DEBUG = Symbol('DEBUG');

export default class File
{
    private static instances = new Map<string, File>();

    private static settings( instance: string | File, options: object )
    {
        return objectStringify({ class: typeof instance === 'string' ? instance : instance.constructor.name,  options }, { sortArrays: true, ignoreUndefinedProperties: true });
    }

    protected static get<T extends File>( path: string, options: object ): T | undefined
    {
        const instance = File.instances.get( path ) as T | undefined;

        if( instance )
        {
            if( File.settings( instance, instance.options ) !== File.settings( 'File', options ))
            {
                throw new Error( `File "${ path }" already exists with different options` );
            }
        }

        return instance;
    }

    public static open( path: string, options: FileOptions )
    {
        let instance = File.get( path, options );

        if( !instance )
        {
            File.instances.set( path, instance = new File( path, options ));
        }

        return instance;
    }

    public static async [FILES_READY]()
    {
        await Promise.all([...File.instances.values()].map( f => f.ready() ));
    }

    private filename: string;
    private saving?: Promise<void>;
    private pendingSave?: Promise<void>;
    protected data?: /*ArrayBuffer |*/ string | object;
    protected loading: Promise<void>;

    protected constructor( protected path: string, protected options: FileOptions )
    {
        File.instances.set( path, this );

        options.format === 'json' && options.type && ( this.data = options.type === 'object' ? {} : []);

        this.filename = ( this.options.encrypted ? RNFetchBlob.fs.dirs.DocumentDir + '/' : '' ) + toBase64URL( path );
        this.loading = this.load();
    }

    private async load()
    {
        let data: string | object | undefined;

        if( this.options.encrypted )
        {
            if( await RNSecureStorage.exist( this.filename ))
            {
                data = ( await RNSecureStorage.getItem( this.filename )) || undefined;
            }
        }
        else
        {
            if( await RNFetchBlob.fs.exists( this.filename ))
            {
                data = ( await RNFetchBlob.fs.readFile( this.filename, 'utf8' )) || undefined;
            }
        }

        if( data === undefined )
        {
            if( this.data === undefined )
            {
                switch( this.options.format )
                {
                    //case 'binary'   : this.data = new ArrayBuffer(0); break;
                    case 'string'   : this.data = ''; break;
                    case 'json'     : this.data = {}; break;
                }
            }
        }
        else
        {
            if( this.options.format === 'json' )
            {
                data = JSON.parse( data as string );

                if( this.data )
                {
                    if( this.options.type === 'object' )
                    {
                        Object.assign( this.data, data );
                    }
                    else
                    {
                        ( this.data as any[] ).push( ...data as any[] );
                    }
                }
            }
        }
    }

    public async ready(): Promise<void>
    {
        await this.loading;
    }

    public async save(): Promise<void>
    {
        if( this.saving )
        {
            if( !this.pendingSave )
            {
                this.pendingSave = new Promise<void>(( resolve ) => this.saving?.then( resolve ) ?? resolve() ).then(() => 
                {
                    this.pendingSave = undefined;
                    
                    return this.save();
                });
            }

            await this.pendingSave;
        }
        else
        {
            // TODO zlepsit aby pri pociatocnom viacnasobnom volani save sa ulozilo len raz - stav ze uz sa uklada az do vnutra
            let saved = this.saving = new Promise( async( resolve ) =>
            {
                if( this.options.encrypted )
                {
                    await RNSecureStorage.setItem( this.filename, this.toString(), { accessible: ACCESSIBLE.WHEN_UNLOCKED });
                }
                else
                {
                    await RNFetchBlob.fs.writeFile( this.filename, this.toString(), 'utf8' );
                }

                this.saving = undefined;

                resolve();
            });

            await saved;
        }
    }

    async delete()
    {
        try
        {
            if( this.options.encrypted )
            {
                await RNSecureStorage.removeItem( this.filename );
            }
            else
            {
                await RNFetchBlob.fs.unlink( this.filename );
            }
        }
        catch( e ){}
    }

    private toString()
    {
        if( this.options.format === 'json' )
        {
            return JSON.stringify( this.data );
        }

        return this.data as string;
    }

    public get content()
    {
        return this.data || '';
    }
    
    public set content( value: string | object )
    {
        this.data = value;

        this.save();
    }
}