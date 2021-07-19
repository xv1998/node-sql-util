import getSelfPromise from '../lib/getSelfPromise'

interface ErrorMessage{
  name: string,
  message: string,
  code: number
}

describe('promise test', () => {
  test('resolve called', async () => {
    const myPromise = getSelfPromise<void>()
    const res = jest.spyOn(myPromise, 'resolve')

    myPromise.resolve()
    await expect(res).toHaveBeenCalled()
  })

  test('reject called', async () => {
    const myPromise = getSelfPromise<void>()
    const rej = jest.spyOn(myPromise, 'reject')

    const err: ErrorMessage= {
      name: 'error',
      message: 'something wrong',
      code: -1
    }
    myPromise.reject(err as Error)
    await expect(rej).toHaveBeenCalled()
  })
})