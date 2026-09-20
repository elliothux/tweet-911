import {
  Background,
  Button,
  Card,
  Cursor,
  Divider,
  Footer,
  Input,
  Notification,
  Radio,
  Title,
} from "animal-island-ui";
import { CheckIcon } from "naive-icons";
import { useEffect, useState } from "react";
import {
  apiBaseUrlItem,
  apiKeyItem,
  DEFAULT_API_BASE,
  getApiConfig,
  hydrateLanguage,
  languageItem,
} from "../../lib/config";
import {
  LANGUAGE_OPTIONS,
  setLanguageSetting,
  subscribeI18n,
  t,
  type LanguageSetting,
} from "../../lib/i18n";

export function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [apiKey, setApiKey] = useState("");
  const [language, setLanguage] = useState<LanguageSetting>("auto");
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    void Promise.all([getApiConfig(), hydrateLanguage()]).then(
      ([config, lang]) => {
        setApiBaseUrl(config.apiBaseUrl || DEFAULT_API_BASE);
        setApiKey(config.apiKey || "");
        setLanguage(lang);
      },
    );
    return subscribeI18n(() => setTick((n) => n + 1));
  }, []);

  async function onLanguage(value: string | number) {
    const next = value as LanguageSetting;
    setLanguage(next);
    setLanguageSetting(next);
    await languageItem.setValue(next);
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        apiBaseUrlItem.setValue(apiBaseUrl.trim()),
        apiKeyItem.setValue(apiKey.trim()),
        languageItem.setValue(language),
      ]);
      Notification.success(t("options.saved"));
    } catch (err) {
      Notification.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Cursor>
      <Background type="default" style={{ minHeight: "100vh", padding: 32 }}>
        <main style={{ maxWidth: 640, margin: "0 auto" }}>
          <Title size="large">{t("app.name")}</Title>
          <Divider type="dashed-brown" />
          <Card>
            <p style={{ color: "var(--animal-text-color)", marginTop: 0 }}>
              {t("options.intro")}
            </p>

            <p
              style={{
                color: "var(--animal-text-color)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {t("options.language")}
            </p>
            <Radio
              value={language}
              onChange={onLanguage}
              options={LANGUAGE_OPTIONS.map((opt) => ({
                label: t(opt.labelKey),
                value: opt.value,
              }))}
            />

            <p
              style={{
                color: "var(--animal-text-color)",
                fontWeight: 600,
                marginBottom: 8,
                marginTop: 24,
              }}
            >
              {t("options.apiBase")}
            </p>
            <Input
              type="url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder={DEFAULT_API_BASE}
              allowClear
              shadow
            />
            <p
              style={{
                color: "var(--animal-text-color)",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {t("options.apiBase.hint")}
            </p>

            <p
              style={{
                color: "var(--animal-text-color)",
                fontWeight: 600,
                marginBottom: 8,
                marginTop: 24,
              }}
            >
              {t("options.apiKey")}
            </p>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave blank if Worker has no API_KEY"
            />
            <p
              style={{
                color: "var(--animal-text-color)",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {t("options.apiKey.hint")}
            </p>

            <Button
              type="primary"
              icon={<CheckIcon />}
              loading={saving}
              onClick={() => void save()}
              style={{ marginTop: 24 }}
            >
              {t("options.save")}
            </Button>
          </Card>
          <Footer />
        </main>
      </Background>
    </Cursor>
  );
}
