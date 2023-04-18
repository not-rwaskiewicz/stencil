/**
 * TODO describe
 *
 */
export type Result<OnSuccess, OnFailure> = Ok<OnSuccess> | Err<OnFailure>;

type Ok<T> = {
  isOk: true;
  isErr: false;
  value: T;
};

type Err<T> = {
  isOk: false;
  isErr: true;
  value: T;
};

/**
 * Create an Ok given a value
 */
export const ok = <T>(value: T): Ok<T> => ({
  isOk: true,
  isErr: false,
  value,
});

export const err = <T>(value: T): Err<T> => ({
  isOk: false,
  isErr: true,
  value,
});

export function map<T1, T2, E>(result: Result<T1, E>, fn: (t: T1) => Promise<T2>): Promise<Result<T2, E>>;
export function map<T1, T2, E>(result: Result<T1, E>, fn: (t: T1) => T2): Result<T2, E>;
export function map<T1, T2, E>(
  result: Result<T1, E>,
  fn: ((t: T1) => T2) | ((t: T1) => Promise<T2>)
): Promise<Result<T2, E>> | Result<T2, E> {
  if (result.isOk) {
    const val = fn(result.value);
    if (val instanceof Promise) {
      return val.then((newVal) => ok(newVal));
    } else {
      return ok(val);
    }
  }

  if (result.isErr) {
    // unwrapping the error is necessary here for typechecking
    const value = result.value;
    return err(value);
  }

  throw 'should never get here';
}

/**
 * Unwrap a {@link Result}, return the value inside if it is an `Ok` and throwing with the wrapped value if it is an `Err`.
 *
 * @param result a result to peer inside of
 * @returns the wrapped value, if `Ok`
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.isOk) {
    return result.value;
  } else {
    throw result.value;
  }
};
