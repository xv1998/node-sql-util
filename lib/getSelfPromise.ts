type resolveType<T> = (data: T) => void
export interface SelfPromise<T> extends Promise<T> {
  resolve: resolveType<T>
  reject: (err: Error) => void
}

export default function getSelfPromise<T>(): SelfPromise<T> {
  let resolveFunc = (() => {}) as resolveType<T>
  let rejectFunc = () => {}
  const p = new Promise((resolve, reject) => {
    resolveFunc = resolve
    rejectFunc = reject
  }) as SelfPromise<T>

  p.resolve = resolveFunc
  p.reject = rejectFunc
  return p
}
