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
    public static load<T>( path: string, options: DictionaryOptions<T> = {} ): Dictionary<T>
    {
        const dictionary = new Dictionary<T>( path, options );

        return dictionary;
    }

    declare protected data: DictionaryData<T>;
    declare protected options: DictionaryOptions<T> & { format: 'json' };

    protected constructor( path: string, options: DictionaryOptions<T> = {})
    {
        super( path, { ...options, format: 'json' });   

        Object.defineProperty( this.data, 'save', { enumerable: false, writable: false, value: () => this.save() });
    }

    public get( key: string ): T | undefined
    {
        return this.data[ key ] || this.options.default?.()
    }

    public set( key: string, value: T ): Dictionary<T>
    {
        this.data[ key ] = value;

        this.save();

        return this;
    }

    public get content(): DictionaryData<T>
    {
        return this.data;
    }

    public set content( _: string | object ){ throw new Error( 'Not implemented' )}
}