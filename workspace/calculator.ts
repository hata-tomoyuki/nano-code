export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * 純粋関数: 2つの数値を加算する
 * エラーは戻り値で表現する
 */
export const add = (a: number, b: number): Result<number, string> => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { ok: false, error: "Invalid number" };
  }
  return { ok: true, value: a + b };
};

/**
 * 純粋関数: a / b を計算する
 * b が 0 の場合や入力が数値でない場合はエラーを返す
 */
export const divide = (a: number, b: number): Result<number, string> => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { ok: false, error: "Invalid number" };
  }
  if (b === 0) {
    return { ok: false, error: "Division by zero" };
  }
  return { ok: true, value: a / b };
};
