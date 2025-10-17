import React, { useState, ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";

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
      const url = isRegister
        ? `${import.meta.env.VITE_API_URL}/api/auth/register`
        : `${import.meta.env.VITE_API_URL}/api/auth/login`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto p-4">
      <Card className="w-full max-w-md relative animate-fade-in">
        <button
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-2xl transition-colors focus-ring rounded"
          onClick={onClose}
          aria-label={t("close")}
          tabIndex={0}
          type="button"
        >
          ×
        </button>

        <CardHeader>
          <CardTitle className="text-center">
            {forgot
              ? t("password_recovery")
              : isRegister
              ? t("registration")
              : t("login")}
          </CardTitle>
          {!forgot && (
            <CardDescription className="text-center">
              {isRegister
                ? t("register_subtitle", "Створіть обліковий запис")
                : t("login_subtitle", "Увійдіть, щоб продовжити навчання")}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {forgot ? (
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              {step === 1 ? (
                <>
                  <Input
                    type="email"
                    name="email"
                    placeholder={t("email")}
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                  {info && (
                    <div className="text-success text-sm text-center bg-success/10 p-2 rounded-md">
                      {info}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("wait") : t("send_code")}
                  </Button>
                </>
              ) : (
                <>
                  {info && (
                    <div className="text-success text-sm text-center bg-success/10 p-2 rounded-md">
                      {info}
                    </div>
                  )}
                  <Input
                    type="text"
                    name="token"
                    placeholder={t("enter_code", "Введіть код")}
                    value={form.token}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                  <Input
                    type="password"
                    name="password"
                    placeholder={t("new_password", "Новий пароль")}
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("wait") : t("change_password")}
                  </Button>
                </>
              )}
              {error && (
                <div className="text-destructive text-sm text-center bg-destructive/10 p-2 rounded-md">
                  {error}
                </div>
              )}
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setForgot(false);
                    setStep(1);
                    setInfo("");
                    setForm({
                      email: "",
                      password: "",
                      username: "",
                      token: "",
                    });
                    setError("");
                  }}
                  className="text-sm"
                >
                  {t("back_to_login")}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  type="email"
                  name="email"
                  placeholder={t("email")}
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  autoFocus
                />
                {isRegister && (
                  <Input
                    type="text"
                    name="username"
                    placeholder={t("username")}
                    value={form.username}
                    onChange={handleChange}
                    required
                    minLength={2}
                    autoComplete="username"
                  />
                )}
                <Input
                  type="password"
                  name="password"
                  placeholder={t("password")}
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                />
                {error && (
                  <div className="text-destructive text-sm text-center bg-destructive/10 p-2 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? t("wait")
                    : isRegister
                    ? t("register")
                    : t("login")}
                </Button>
              </form>

              <div className="text-center mt-4 text-sm space-y-2">
                {isRegister ? (
                  <p className="text-muted-foreground">
                    {t("already_have_account")}{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      type="button"
                      onClick={() => {
                        setIsRegister(false);
                        setError("");
                      }}
                    >
                      {t("login")}
                    </Button>
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      {t("no_account")}{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal"
                        type="button"
                        onClick={() => {
                          setIsRegister(true);
                          setError("");
                        }}
                      >
                        {t("register")}
                      </Button>
                    </p>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal text-xs"
                      type="button"
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
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
