import File, { FileOptions } from './file';

export type DictionaryOptions<T> = Omit<FileOptions, 'format'> &
{
    expiration? : number
    default?    : () => T
}

export type DictionaryData<T> = Record<string, T> & 
{
    save: () => Promise<void>
}

export default class Dictionary<T> extends File
{
    public static open<T>( path: string, options: DictionaryOptions<T> = {} ): Dictionary<T>
    {
        let instance = File.get<Dictionary<T>>( path, options );

        if( !instance ){ instance = new Dictionary<T>( path, options )}

        return instance;
    }

    declare protected data: DictionaryData<T>;
    declare protected options: DictionaryOptions<T> & { format: 'json' };

    protected constructor( path: string, options: DictionaryOptions<T> = {})
    {
        super( path, { ...options, format: 'json', type: 'object' });

        Object.defineProperty( this.data, 'save', { enumerable: false, writable: false, value: () => this.save() });
    }

    public get( key: string ): T | undefined
    {
        if( !this.data.hasOwnProperty( key ) && this.options.default )
        {
            this.set( key, this.options.default());
        }

        return this.data[ key ];
    }

    public set( key: string, value: T ): Dictionary<T>
    {
        this.data[ key ] = value;

        this.save();

        return this;
    }   

    public assign( key: string, ...values: Partial<T>[] ): Dictionary<T>
    {
        if( !this.data.hasOwnProperty( key ))
        {
            this.data[ key ] = this.options.default?.() ?? {} as T;
        }

        if( typeof this.data[ key ] !== 'object' )
        {
            throw new Error( `Dictionary "${ this.path }" key "${ key }" is not an object` );
        }

        Object.assign( this.data[ key ]!, ...values );

        this.save();

        return this;
    }

    public get content(): DictionaryData<T>
    {
        return this.data;
    }

    public set content( _: string | object ){ throw new Error( 'Not implemented' )}
}