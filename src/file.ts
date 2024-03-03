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

export default class File
{
    private path: string;
    private saving?: Promise<void>;
    private pendingSave?: Promise<void>;
    protected data?: /*ArrayBuffer |*/ string | object;

    protected constructor( path: string, protected options: FileOptions )
    {
        options.format === 'json' && options.type && ( this.data = options.type === 'object' ? {} : []);

        this.path = ( this.options.encrypted ? RNFetchBlob.fs.dirs.DocumentDir + '/' : '' ) + toBase64URL( path );

        this.load();
    }

    private async load()
    {
        let data: string | object | undefined;

        if( this.options.encrypted )
        {
            if( await RNSecureStorage.exist( this.path ))
            {
                data = ( await RNSecureStorage.getItem( this.path )) || undefined;
            }
        }
        else
        {
            if( await RNFetchBlob.fs.exists( this.path ))
            {
                data = ( await RNFetchBlob.fs.readFile( this.path, 'utf8' )) || undefined;
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
                    await RNSecureStorage.setItem( this.path, this.toString(), { accessible: ACCESSIBLE.WHEN_UNLOCKED });
                }
                else
                {
                    await RNFetchBlob.fs.writeFile( this.path, this.toString(), 'utf8' );
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
                await RNSecureStorage.removeItem( this.path );
            }
            else
            {
                await RNFetchBlob.fs.unlink( this.path );
            }
        }
        catch( e ){}
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

    private toString()
    {
        if( this.options.format === 'json' )
        {
            return JSON.stringify( this.data );
        }

        return this.data as string;
    }
}