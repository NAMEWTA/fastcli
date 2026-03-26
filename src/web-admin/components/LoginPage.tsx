import { useState, type FormEvent } from 'react';

export interface LoginPageProps {
  error: string | null;
  submitting: boolean;
  onSubmit(token: string): Promise<void> | void;
}

export function LoginPage({
  error,
  submitting,
  onSubmit,
}: LoginPageProps) {
  const [token, setToken] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextToken = token.trim();
    if (nextToken === '') {
      return;
    }

    await onSubmit(nextToken);
  }

  return (
    <main className="login-layout">
      <section className="login-card">
        <div className="login-card__badge">fastcli web</div>
        <h1>输入一次性口令</h1>
        <p>
          在终端里复制启动命令输出的口令。验证通过后，才会进入本机管理后台。
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>一次性口令</span>
            <input
              autoComplete="one-time-code"
              className="field__input"
              disabled={submitting}
              onChange={(event) => setToken(event.target.value)}
              placeholder="例如：ABCD-1234"
              value={token}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? '验证中...' : '进入后台'}
          </button>
        </form>
      </section>
    </main>
  );
}
