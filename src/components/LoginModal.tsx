import React, { useState, ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}

interface FormState {
  email: string;
  password: string;
  username: string;
  token: string;
}

export default function LoginModal({
  open,
  onClose,
  onSuccess,
}: LoginModalProps) {
  const { t } = useTranslation();

  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    username: "",
    token: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [forgot, setForgot] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);

  if (!open) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // --- LOGIN/REGISTER submit ---
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? {
            email: form.email.trim(),
            password: form.password,
            username: form.username.trim(),
          }
        : {
            email: form.email.trim(),
            password: form.password,
          };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("error_authorization"));
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (onSuccess) onSuccess(data.user);
        onClose();
      } else if (isRegister && data.user) {
        if (onSuccess) onSuccess(data.user);
        setIsRegister(false);
        setForm({ email: form.email, password: "", username: "", token: "" });
        setError(t("registration_success"));
      }
      setLoading(false);
    } catch (err) {
      setError(t("error_occurred"));
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD FLOW ---
  const handleForgotSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (step === 1) {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email.trim() }),
          }
        );
        const data = await res.json();
        setLoading(false);
        setForm((f) => ({ ...f, token: "", password: "" }));
        if (res.ok) {
          setStep(2);
          setInfo(t("code_sent_info"));
        } else {
          setError(data.message || t("error_sending_email"));
        }
      } else if (step === 2) {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: form.email.trim(),
              token: form.token.trim(),
              password: form.password,
            }),
          }
        );
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
          setForgot(false);
          setStep(1);
          setInfo("");
          setForm({ email: form.email, password: "", username: "", token: "" });
          setError(t("password_changed_info"));
        } else {
          setError(data.message || t("invalid_or_expired_code"));
        }
      }
    } catch {
      setError(t("error_occurred"));
      setLoading(false);
    }
  };

  // --- RENDER FORM ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-xs mx-auto rounded-2xl shadow-xl p-6 relative">
        <button
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label={t("close")}
          tabIndex={0}
          type="button"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-3 text-center">
          {forgot
            ? t("password_recovery")
            : isRegister
            ? t("registration")
            : t("login")}
        </h2>

        {forgot ? (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
            {step === 1 ? (
              <>
                <input
                  type="email"
                  name="email"
                  placeholder={t("email")}
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="p-2 rounded border w-full"
                  autoComplete="email"
                  autoFocus
                />
                {info && (
                  <div className="text-green-600 text-sm text-center">
                    {info}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl font-semibold bg-blue-500 text-white mt-2"
                  disabled={loading}
                >
                  {loading ? t("wait") : t("send_code")}
                </button>
              </>
            ) : (
              <>
                {info && (
                  <div className="text-green-600 text-sm text-center">
                    {info}
                  </div>
                )}
                <input
                  type="text"
                  name="token"
                  placeholder={t("code_sent_info")}
                  value={form.token}
                  onChange={handleChange}
                  className="p-2 rounded border w-full"
                  required
                  autoFocus
                />
                <input
                  type="password"
                  name="password"
                  placeholder={t("password")}
                  value={form.password}
                  onChange={handleChange}
                  className="p-2 rounded border w-full"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl font-semibold bg-blue-500 text-white mt-2"
                  disabled={loading}
                >
                  {loading ? t("wait") : t("change_password")}
                </button>
              </>
            )}
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  setForgot(false);
                  setStep(1);
                  setInfo("");
                  setForm({ email: "", password: "", username: "", token: "" });
                  setError("");
                }}
                className="text-xs text-gray-500 hover:underline"
              >
                {t("back_to_login")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                name="email"
                placeholder={t("email")}
                value={form.email}
                onChange={handleChange}
                required
                className="p-2 rounded border w-full"
                autoComplete="email"
                autoFocus
              />
              {isRegister && (
                <input
                  type="text"
                  name="username"
                  placeholder={t("username")}
                  value={form.username}
                  onChange={handleChange}
                  required
                  minLength={2}
                  className="p-2 rounded border w-full"
                  autoComplete="username"
                />
              )}
              <input
                type="password"
                name="password"
                placeholder={t("password")}
                value={form.password}
                onChange={handleChange}
                required
                className="p-2 rounded border w-full"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}
              <button
                type="submit"
                className={`w-full py-2 rounded-xl font-semibold bg-blue-500 text-white mt-2 ${
                  loading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-600"
                }`}
                disabled={loading}
              >
                {loading ? t("wait") : isRegister ? t("register") : t("login")}
              </button>
            </form>
            <div className="text-center mt-3 text-sm">
              {isRegister ? (
                <>
                  {t("already_have_account")}{" "}
                  <button
                    className="text-blue-600 hover:underline"
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError("");
                    }}
                  >
                    {t("login")}
                  </button>
                </>
              ) : (
                <>
                  {t("no_account")}{" "}
                  <button
                    className="text-blue-600 hover:underline"
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError("");
                    }}
                  >
                    {t("register")}
                  </button>
                  <br />
                  <button
                    className="text-blue-600 hover:underline mt-2"
                    type="button"
                    style={{ fontSize: "0.85em" }}
                    onClick={() => {
                      setForgot(true);
                      setError("");
                      setInfo("");
                      setStep(1);
                      setForm({
                        email: "",
                        password: "",
                        username: "",
                        token: "",
                      });
                    }}
                  >
                    {t("forgot_password")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
