import File, { FileOptions } from './file';

export type StoreOptions = Omit<FileOptions, 'format' | 'type'> & 
{
    type: 'object' | 'array'
}

export type StoreData<T> = T & 
{
    save    : () => Promise<void>
    delete  : () => Promise<void>
}

export default class Store<T> extends File
{
    public static load<T>( path: string, options: StoreOptions ): StoreData<T>
    {
        const dictionary = new Store<T>( path, options );

        return dictionary.data!;
    }

    declare protected data: StoreData<T>;
    declare protected options: StoreOptions & { format: 'json' };

    protected constructor( path: string, options: StoreOptions )
    {
        super( path, { ...options, format: 'json' });

        Object.defineProperty( this.data, 'save', { enumerable: false, writable: false, value: () => this.save() });
        Object.defineProperty( this.data, 'delete', { enumerable: false, writable: false, value: () => this.delete() });
    }

    public get content(): StoreData<T>
    {
        return this.data;
    }

    public set content( _: string | object ){ throw new Error( 'Not implemented' )}
}