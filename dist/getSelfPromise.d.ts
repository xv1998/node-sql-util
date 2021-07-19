declare type resolveType<T> = (data: T) => void;
export interface SelfPromise<T> extends Promise<T> {
    resolve: resolveType<T>;
    reject: (err: Error) => void;
}
export default function getSelfPromise<T>(): SelfPromise<T>;
export {};
